// Patient Dashboard Component
// Displays medication adherence, dose history, and analytics

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import {
  getDeviceSettings,
  subscribeToDeviceSettings,
  subscribeToDoseLogs,
  calculateAdherence,
  getUser
} from '../firebase/database';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, isAfter, parse, isBefore, differenceInMinutes, differenceInSeconds } from 'date-fns';
import toast from 'react-hot-toast';
import {
  requestNotificationPermission,
  showDoseReminder,
  showMissedDoseAlert,
  isNotificationPermitted
} from '../utils/notifications';
import { requestFCMToken, setupForegroundMessageListener } from '../utils/fcm';

const PatientDashboard = ({ user, setUser }) => {
  const [settings, setSettings] = useState(null);
  const [doseLogs, setDoseLogs] = useState([]);
  const [adherence, setAdherence] = useState({ week: null, month: null });
  const [loading, setLoading] = useState(true);
  const [settingsNotFound, setSettingsNotFound] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null); // { type: 'morning'|'evening', time: Date }

  // Security check: Ensure user is a patient
  useEffect(() => {
    if (user && user.role !== 'patient') {
      toast.error('Access denied. Patient access only.');
      setUser(null);
      return;
    }
  }, [user, setUser]);

  useEffect(() => {
    // Only load if user is authenticated and is a patient
    if (!user || !user.uid || user.role !== 'patient') {
      setLoading(false);
      return;
    }

    let unsubscribeSettings = null;
    let unsubscribeLogs = null;

    // Get custom UID from user document and load data
    const loadPatientData = async () => {
      try {
        const userData = await getUser(user.uid);
        let customUID = userData?.customUID;

        // Fallback: If customUID not in users doc, try to find it from settings
        if (!customUID) {
          try {
            const settingsRef = collection(db, 'settings');
            const q = query(settingsRef, where('firebaseUID', '==', user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const settingsDoc = querySnapshot.docs[0];
              const settingsData = settingsDoc.data();
              customUID = settingsData.customUID || settingsDoc.id;
              console.log('Found customUID from settings:', customUID);

              // Also update the users document with the found customUID for future
              try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { customUID: customUID });
              } catch (updateError) {
                console.error('Could not update users doc:', updateError);
              }
            }
          } catch (fallbackError) {
            console.error('Error in fallback search:', fallbackError);
          }
        }

        if (!customUID) {
          setSettingsNotFound(true);
          setLoading(false);
          toast.error('Custom Patient ID not assigned. Please contact your caregiver.');
          return;
        }

        // Use custom UID to load settings
        loadData(customUID);

        // Subscribe to real-time updates using custom UID
        unsubscribeSettings = subscribeToDeviceSettings(customUID, (data) => {
          if (data) {
            setSettings(data);
            setSettingsNotFound(false);
          } else {
            setSettingsNotFound(true);
          }
        });

        unsubscribeLogs = subscribeToDoseLogs(customUID, (logs) => {
          setDoseLogs(logs);
          updateAdherence(customUID, logs);
        });
      } catch (error) {
        console.error('Error loading patient data:', error);
        setSettingsNotFound(true);
        setLoading(false);
      }
    };

    loadPatientData();

    // Request notification permission and FCM token on mount
    const setupNotifications = async () => {
      const permitted = await requestNotificationPermission();
      setNotificationPermission(permitted);

      if (permitted && user?.uid) {
        // Request FCM token for background notifications
        try {
          const token = await requestFCMToken(user.uid);
          if (token) {
            console.log('FCM token registered for background notifications');
          }
        } catch (error) {
          console.error('FCM token registration failed:', error);
        }

        // Setup foreground message listener
        setupForegroundMessageListener((payload) => {
          console.log('FCM message received:', payload);
          if (payload.notification) {
            toast(payload.notification.title, {
              icon: '💊',
              duration: 10000
            });
          }
        });

        toast.success('Notifications enabled! You will receive reminders even when the website is closed.');
      }
    };

    setupNotifications();

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [user?.uid, user?.role]);

  // Check for upcoming doses and show reminders
  useEffect(() => {
    if (!settings || !settings.morningDoseTime || !settings.eveningDoseTime) return;

    const checkReminders = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      // Parse dose times
      const morningTime = parse(settings.morningDoseTime, 'HH:mm', now);
      const eveningTime = parse(settings.eveningDoseTime, 'HH:mm', now);

      const morningDateTime = new Date(`${today}T${settings.morningDoseTime}:00`);
      const eveningDateTime = new Date(`${today}T${settings.eveningDoseTime}:00`);

      // Check if it's time for morning dose (within 1 minute window)
      const morningDiff = differenceInSeconds(now, morningDateTime);
      if (Math.abs(morningDiff) <= 60 && morningDiff >= 0) {
        // Check if we already logged this today
        const todayMorningLog = doseLogs.find(log => {
          const logDate = log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd');
          return logDate === today && log.doseType === 'morning';
        });

        if (!todayMorningLog && (!activeReminder || activeReminder.type !== 'morning')) {
          setActiveReminder({ type: 'morning', time: morningDateTime });
          if (notificationPermission) {
            showDoseReminder('morning', settings.morningDoseTime);
          }
          toast('💊 Time to take your morning pills!', {
            icon: '💊',
            duration: 60000
          });
        }
      }

      // Check if it's time for evening dose (within 1 minute window)
      const eveningDiff = differenceInSeconds(now, eveningDateTime);
      if (Math.abs(eveningDiff) <= 60 && eveningDiff >= 0) {
        // Check if we already logged this today
        const todayEveningLog = doseLogs.find(log => {
          const logDate = log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd');
          return logDate === today && log.doseType === 'evening';
        });

        if (!todayEveningLog && (!activeReminder || activeReminder.type !== 'evening')) {
          setActiveReminder({ type: 'evening', time: eveningDateTime });
          if (notificationPermission) {
            showDoseReminder('evening', settings.eveningDoseTime);
          }
          toast('💊 Time to take your evening pills!', {
            icon: '💊',
            duration: 60000
          });
        }
      }

      // Clear reminder if dose was taken
      if (activeReminder) {
        const todayLog = doseLogs.find(log => {
          const logDate = log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd');
          return logDate === today && log.doseType === activeReminder.type && log.status === 'taken';
        });
        if (todayLog) {
          setActiveReminder(null);
        }
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkReminders, 10000);
    checkReminders(); // Check immediately

    return () => clearInterval(interval);
  }, [settings, doseLogs, notificationPermission, activeReminder]);

  const loadData = async (patientId) => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const deviceSettings = await getDeviceSettings(patientId);
      if (deviceSettings) {
        setSettings(deviceSettings);
        setSettingsNotFound(false);
      } else {
        setSettingsNotFound(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Failed to load your data. Please contact your caregiver.');
      setSettingsNotFound(true);
      setLoading(false);
    }
  };

  const updateAdherence = async (patientId, logs) => {
    if (!patientId) return;
    const weekStats = await calculateAdherence(patientId, 'week');
    const monthStats = await calculateAdherence(patientId, 'month');
    setAdherence({ week: weekStats, month: monthStats });
  };

  const handleTestNotification = async () => {
    if (!notificationPermission) {
      const permitted = await requestNotificationPermission();
      setNotificationPermission(permitted);
      if (!permitted) {
        toast.error('Please enable notifications first');
        return;
      }
    }

    showDoseReminder('Test', format(new Date(), 'HH:mm'));
    toast.success('Test notification sent!');
  };

  const getNextDose = () => {
    if (!settings || !settings.morningDoseTime || !settings.eveningDoseTime) return null;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    const morningDateTime = new Date(`${today}T${settings.morningDoseTime}:00`);
    const eveningDateTime = new Date(`${today}T${settings.eveningDoseTime}:00`);

    // Check if morning dose is still today and not passed
    if (isAfter(morningDateTime, now)) {
      return { time: morningDateTime, type: 'Morning' };
    }

    // Check if evening dose is still today and not passed
    if (isAfter(eveningDateTime, now)) {
      return { time: eveningDateTime, type: 'Evening' };
    }

    // Next dose is tomorrow's morning
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { time: new Date(`${format(tomorrow, 'yyyy-MM-dd')}T${settings.morningDoseTime}:00`), type: 'Morning' };
  };

  const prepareChartData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayLogs = doseLogs.filter(log => {
        const logDate = log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(log.createdAt), 'yyyy-MM-dd');
        return logDate === dateStr;
      });

      last7Days.push({
        date: format(date, 'MMM dd'),
        taken: dayLogs.filter(l => l.status === 'taken').length,
        missed: dayLogs.filter(l => l.status === 'missed').length
      });
    }
    return last7Days;
  };

  const getTotalMissed = () => {
    return doseLogs.filter(log => log.status === 'missed').length;
  };

  const getStatusColor = (status) => {
    return status === 'online' ? 'green' : 'red';
  };

  const formatDelay = (log) => {
    // Check for delaySeconds first (new format), then fall back to delayMinutes (old format)
    const delaySeconds = log.delaySeconds || (log.delayMinutes ? log.delayMinutes * 60 : 0);

    if (delaySeconds === 0) return '-';

    const hours = Math.floor(delaySeconds / 3600);
    const minutes = Math.floor((delaySeconds % 3600) / 60);
    const seconds = delaySeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  // Security: Redirect if not a patient
  if (user && user.role !== 'patient') {
    return (
      <Layout user={user} setUser={setUser} title="Access Denied">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <p className="text-rose-300 font-semibold text-sm tracking-wide">Access Denied</p>
            <p className="text-slate-400 text-xs">This area is for patients only.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout user={user} setUser={setUser} title="Patient Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      </Layout>
    );
  }

  // Show message if settings not found
  if (settingsNotFound || !settings) {
    return (
      <Layout user={user} setUser={setUser} title="Patient Dashboard">
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-500/70 bg-amber-950/40 p-6 shadow-lg shadow-amber-900/40">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-amber-300 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-amber-100">Settings Not Configured</h3>
                <p className="text-sm text-amber-100/80 mt-2">
                  Your medication settings have not been set up yet. Please contact your caregiver to configure your dose schedule.
                </p>
                <p className="text-xs text-amber-200/80 mt-2">
                  Your Patient ID: <strong>{user?.uid}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const nextDose = getNextDose();
  const chartData = prepareChartData();
  const totalMissed = getTotalMissed();
  const pieData = [
    { name: 'Taken', value: adherence.week?.taken || 0 },
    { name: 'Missed', value: adherence.week?.missed || 0 }
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <Layout user={user} setUser={setUser} title="Patient Dashboard">
      <div className="space-y-6">
        {/* Active Reminder Banner - Prominent Display */}
        {activeReminder && (
          <div className="bg-rose-950/40 border-4 border-rose-500/80 rounded-xl p-6 animate-pulse shadow-xl shadow-rose-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-rose-300 animate-bounce">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-rose-50">💊 MEDICATION REMINDER</h3>
                  <p className="text-xl text-rose-100 mt-2 font-semibold">
                    Time to take your <strong className="text-rose-50">{activeReminder.type.toUpperCase()}</strong> pills!
                  </p>
                  <p className="text-base text-rose-100/80 mt-2">
                    Scheduled time: <strong>{format(activeReminder.time, 'HH:mm')}</strong>
                  </p>
                  <p className="text-sm text-rose-200/80 mt-2 italic">
                    Please take your medication now. The device will detect when you remove the pills.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveReminder(null)}
                className="text-rose-300 hover:text-rose-100 p-2 rounded-lg hover:bg-rose-900/40"
                title="Dismiss reminder"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Patient Info Banner */}
        <div className="rounded-xl border border-sky-700/70 bg-sky-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-sky-100">Your Account</p>
              <p className="text-xs text-sky-200 mt-1">Patient ID: {user?.uid}</p>
            </div>
            <div className="text-sky-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Morning Pills Remaining"
            value={settings?.morningPillCount || 0}
            subtitle={settings?.morningPillCount <= 10 ? 'Low stock alert' : 'In stock'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            color={settings?.morningPillCount <= 10 ? 'red' : 'primary'}
          />
          <StatCard
            title="Evening Pills Remaining"
            value={settings?.eveningPillCount || 0}
            subtitle={settings?.eveningPillCount <= 10 ? 'Low stock alert' : 'In stock'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            color={settings?.eveningPillCount <= 10 ? 'red' : 'primary'}
          />
          <StatCard
            title="Total Missed Doses"
            value={totalMissed}
            subtitle="All time"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
          />
          <StatCard
            title="Weekly Adherence"
            value={`${adherence.week?.percentage || 0}%`}
            subtitle={`${adherence.week?.taken || 0} taken, ${adherence.week?.missed || 0} missed`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color={adherence.week?.percentage >= 80 ? 'green' : 'yellow'}
          />
          <StatCard
            title="Device Status"
            value={settings?.deviceStatus === 'online' ? 'Online' : 'Offline'}
            subtitle={settings?.lastSync ? `Last sync: ${format(settings.lastSync.toDate(), 'MMM dd, HH:mm')}` : 'Never synced'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            }
            color={getStatusColor(settings?.deviceStatus)}
          />
        </div>

        {/* Medication Schedule View */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/60">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-50">Your Medication Schedule</h3>
            <button
              onClick={handleTestNotification}
              className="px-4 py-2 text-sm font-medium text-sky-200 bg-slate-900/60 border border-sky-500/60 rounded-lg hover:bg-slate-900 hover:text-sky-100 transition-colors"
            >
              Test Notification
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">Morning Dose Time</p>
              <p className="text-xl font-bold text-slate-50">{settings?.morningDoseTime || 'Not set'}</p>
            </div>
            <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">Evening Dose Time</p>
              <p className="text-xl font-bold text-slate-50">{settings?.eveningDoseTime || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {!notificationPermission && (
          <div className="rounded-xl border border-amber-500/70 bg-amber-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-100">Enable Notifications</p>
                  <p className="text-xs text-amber-200/80">Get reminders even when the website is closed</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const permitted = await requestNotificationPermission();
                  setNotificationPermission(permitted);
                  if (permitted) {
                    toast.success('Notifications enabled!');
                  } else {
                    toast.error('Please enable notifications in your browser settings.');
                  }
                }}
                className="px-4 py-2 bg-amber-400 text-slate-950 text-sm rounded-lg hover:bg-amber-300"
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {/* Next Dose Alert */}
        {nextDose && !activeReminder && (
          <div className="rounded-xl border border-sky-600/70 bg-sky-950/40 p-6 shadow-lg shadow-sky-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-sky-100">Next Scheduled Dose</h3>
                <p className="text-2xl font-bold text-sky-200 mt-2">
                  {nextDose.type} Dose - {format(nextDose.time, 'MMM dd, yyyy')} at {format(nextDose.time, 'HH:mm')}
                </p>
              </div>
              <div className="text-sky-300">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Dose Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/60">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Daily Dose History (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1f2937', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="taken" fill="#22c55e" name="Taken" />
                <Bar dataKey="missed" fill="#ef4444" name="Missed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Adherence Pie Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/60">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Weekly Adherence Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#38bdf8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1f2937', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Adherence */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/60">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Monthly Adherence</h3>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-sky-400">{adherence.month?.percentage || 0}%</p>
              <p className="text-sm text-slate-400 mt-1">Adherence Rate</p>
            </div>
            <div className="flex-1 ml-8">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Taken: {adherence.month?.taken || 0}</span>
                <span>Missed: {adherence.month?.missed || 0}</span>
                <span>Total: {adherence.month?.total || 0}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 h-4 rounded-full transition-all"
                  style={{ width: `${adherence.month?.percentage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Dose History */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/60">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Recent Dose History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Dose Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Delay</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/60 divide-y divide-slate-800">
                {doseLogs.slice(0, 10).map((log) => {
                  const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
                  return (
                    <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                        {format(logDate, 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {log.doseType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'taken'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                          }`}>
                          {log.status === 'taken' ? 'Taken' : 'Missed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatDelay(log)}
                      </td>
                    </tr>
                  );
                })}
                {doseLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">
                      No dose history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDashboard;

