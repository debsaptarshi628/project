// Firestore Database Operations
// Handles all database read/write operations for the pill dispenser system

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./config";

// Collection names
const COLLECTIONS = {
  USERS: "users",
  DEVICES: "devices",
  DOSE_LOGS: "doseLogs",
  SETTINGS: "settings"
};

/**
 * Get user document
 */
export const getUser = async (userId) => {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
};

/**
 * Get patient by custom UID (e.g., U1, U101)
 * Primary source: users collection (customUID field)
 * Fallback: if user not found but settings/{customUID} exists, treat as existing patient
 */
export const getPatientByCustomUID = async (customUID) => {
  try {
    // 1) Look up in users collection by customUID
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where("customUID", "==", customUID));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data(), source: "users" };
    }

    // 2) Fallback: check if settings/{customUID} exists (older data or missing user doc)
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, customUID);
    const settingsDoc = await getDoc(settingsRef);
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        id: data.firebaseUID || customUID,
        customUID,
        source: "settings"
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting patient by custom UID:', error);
    return null;
  }
};

/**
 * Set custom UID for a patient
 * @param {string} firebaseUID - Firebase user UID
 * @param {string} customUID - Custom patient ID (e.g., U1, U101)
 * @param {string} caregiverEmail - Email of the caregiver assigning this patient
 * @param {string} caregiverUID - UID of the caregiver
 * @param {string} patientEmail - Email of the patient account (used for auto-link on login)
 */
export const setCustomUID = async (
  firebaseUID,
  customUID,
  caregiverEmail = null,
  caregiverUID = null,
  patientEmail = null
) => {
  try {
    // Check if custom UID already exists
    const existingPatient = await getPatientByCustomUID(customUID);
    if (existingPatient && existingPatient.id !== firebaseUID) {
      throw new Error(`Custom UID "${customUID}" is already assigned to another patient`);
    }
    
    // Update user document with custom UID
    const userRef = doc(db, COLLECTIONS.USERS, firebaseUID);
    await updateDoc(userRef, {
      customUID: customUID,
      ...(patientEmail && { email: patientEmail })
    });
    
    // Also store in settings document for easy lookup
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, customUID);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      // Create settings document with custom UID as ID
      await setDoc(settingsRef, {
        firebaseUID: firebaseUID,
        customUID: customUID,
        deviceId: customUID,
      morningDoseTime: null,
      eveningDoseTime: null,
      morningPillCount: 0,
      eveningPillCount: 0,
        ...(patientEmail && { patientEmail }),
        caregiverEmail: caregiverEmail,
        caregiverUID: caregiverUID,
        deviceStatus: "offline",
        lastSync: null,
        createdAt: serverTimestamp(),
        createdBy: "caregiver",
        lastUpdated: serverTimestamp()
      });
    } else {
      // Update existing settings with firebaseUID mapping and caregiver info
      await updateDoc(settingsRef, {
        firebaseUID: firebaseUID,
        customUID: customUID,
        ...(patientEmail && { patientEmail }),
        ...(caregiverEmail && { caregiverEmail: caregiverEmail }),
        ...(caregiverUID && { caregiverUID: caregiverUID })
      });
    }

    // IMPORTANT (rules compatibility):
    // Old Firestore rules allow patients to read `/settings/{request.auth.uid}`.
    // Your actual settings live at `/settings/{customUID}` (e.g., U1), so we mirror a copy at `/settings/{firebaseUID}`.
    // This allows the Patient Dashboard to load settings without changing security rules.
    const mirrorSettingsRef = doc(db, COLLECTIONS.SETTINGS, firebaseUID);
    const mirrorPayload = {
      firebaseUID,
      customUID,
      deviceId: customUID,
      ...(patientEmail && { patientEmail }),
      ...(caregiverEmail && { caregiverEmail }),
      ...(caregiverUID && { caregiverUID }),
      lastUpdated: serverTimestamp(),
    };
    await setDoc(mirrorSettingsRef, mirrorPayload, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error setting custom UID:', error);
    throw error;
  }
};

/**
 * Get all patients assigned to a caregiver
 * @param {string} caregiverEmail - Email of the caregiver
 * @returns {Promise<Array>} Array of patient settings
 */
export const getCaregiverPatients = async (caregiverEmail) => {
  try {
    const settingsRef = collection(db, COLLECTIONS.SETTINGS);
    const q = query(settingsRef, where("caregiverEmail", "==", caregiverEmail));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting caregiver patients:', error);
    return [];
  }
};

/**
 * Get all patients assigned to a caregiver by UID
 * @param {string} caregiverUID - UID of the caregiver
 * @returns {Promise<Array>} Array of patient settings
 */
export const getCaregiverPatientsByUID = async (caregiverUID) => {
  try {
    const settingsRef = collection(db, COLLECTIONS.SETTINGS);
    const q = query(settingsRef, where("caregiverUID", "==", caregiverUID));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting caregiver patients by UID:', error);
    return [];
  }
};

/**
 * Get device settings for a patient by custom UID or Firebase UID
 */
export const getDeviceSettings = async (patientId) => {
  // First try to get by custom UID (settings collection uses custom UID as document ID)
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, patientId);
  const settingsDoc = await getDoc(settingsRef);
  
  if (settingsDoc.exists()) {
    const data = { id: settingsDoc.id, ...settingsDoc.data() };

    // Compatibility with the *previous* Firestore rules:
    // Patients can read only `/settings/{request.auth.uid}`.
    // But caregiver/admin data is stored at `/settings/{customUID}` (e.g., U1).
    // If this doc contains a `firebaseUID`, mirror the full settings into `/settings/{firebaseUID}`
    // so the patient dashboard can read it without changing rules.
    try {
      const firebaseUID = data.firebaseUID;
      if (firebaseUID && firebaseUID !== settingsDoc.id) {
        const mirrorRef = doc(db, COLLECTIONS.SETTINGS, firebaseUID);
        await setDoc(
          mirrorRef,
          {
            ...data,
            id: firebaseUID,
            deviceId: data.customUID || data.deviceId || settingsDoc.id,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (mirrorErr) {
      // Mirroring is best-effort; if it fails we still return the caregiver-visible data.
      console.error('Error mirroring settings to firebaseUID doc:', mirrorErr);
    }

    return data;
  }
  
  // If not found, try to find by firebaseUID field
  try {
    const settingsRef = collection(db, COLLECTIONS.SETTINGS);
    const q = query(settingsRef, where("firebaseUID", "==", patientId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.error('Error searching by firebaseUID:', error);
  }
  
  // Return null if settings don't exist (don't create automatically)
  return null;
};

/**
 * Create device settings for a patient (explicit creation)
 * Used when caregiver first sets up a patient
 * No default times - caregiver must set them
 * patientId should be the custom UID (e.g., U1, U101)
 */
export const createDeviceSettings = async (patientId, settings = {}) => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, patientId);
  const settingsDoc = await getDoc(settingsRef);
  
  // If settings already exist, return them
  if (settingsDoc.exists()) {
    return { id: settingsDoc.id, ...settingsDoc.data() };
  }
  
  // Create new settings with provided values only (no defaults for times)
  const newSettings = {
    morningDoseTime: settings.morningDoseTime || null,
    eveningDoseTime: settings.eveningDoseTime || null,
    morningPillCount: settings.morningPillCount || 0,
    eveningPillCount: settings.eveningPillCount || 0,
    deviceId: patientId,
    customUID: patientId, // Store custom UID
    firebaseUID: settings.firebaseUID || null, // Store Firebase UID mapping
    caregiverEmail: settings.caregiverEmail || null, // Store caregiver email for notifications
    caregiverUID: settings.caregiverUID || null, // Store caregiver UID
    deviceStatus: "offline",
    lastSync: null,
    createdAt: serverTimestamp(),
    createdBy: "caregiver",
    lastUpdated: serverTimestamp()
  };
  
  await setDoc(settingsRef, newSettings);
  return { id: settingsRef.id, ...newSettings };
};

/**
 * Update device settings (caregiver only)
 * Does not create settings if they don't exist - use createDeviceSettings first
 */
export const updateDeviceSettings = async (patientId, updates) => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, patientId);
  const settingsDoc = await getDoc(settingsRef);
  
  if (!settingsDoc.exists()) {
    throw new Error('Settings do not exist. Please create them first.');
  }
  
  // Update existing settings (preserve caregiver info if not being updated)
  const updateData = {
    ...updates,
    lastUpdated: serverTimestamp()
  };
  
  // Don't overwrite caregiver info unless explicitly provided
  if (!updates.caregiverEmail) {
    const currentData = settingsDoc.data();
    if (currentData.caregiverEmail) {
      updateData.caregiverEmail = currentData.caregiverEmail;
    }
  }
  if (!updates.caregiverUID) {
    const currentData = settingsDoc.data();
    if (currentData.caregiverUID) {
      updateData.caregiverUID = currentData.caregiverUID;
    }
  }
  
  await updateDoc(settingsRef, updateData);
};

/**
 * Log a dose event (taken or missed)
 */
export const logDose = async (patientId, doseData) => {
  const logRef = doc(collection(db, COLLECTIONS.DOSE_LOGS));
  const logEntry = {
    patientId,
    ...doseData,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString()
  };
  
  await setDoc(logRef, logEntry);
  return logEntry;
};

/**
 * Get dose logs for a patient with filters
 */
export const getDoseLogs = async (patientId, filters = {}) => {
  let q = query(
    collection(db, COLLECTIONS.DOSE_LOGS),
    where("patientId", "==", patientId)
  );
  
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }
  
  const querySnapshot = await getDocs(q);
  const logs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Sort client-side by timestamp desc (no Firestore composite index needed)
  logs.sort((a, b) => {
    const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.createdAt);
    const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.createdAt);
    return dateB - dateA;
  });

  return logs;
};

/**
 * Real-time listener for device settings
 * Security: Only allows patients to access their own settings
 */
export const subscribeToDeviceSettings = (patientId, callback) => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, patientId);
  return onSnapshot(settingsRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null); // Settings don't exist
    }
  }, (error) => {
    console.error('Error in settings subscription:', error);
    callback(null);
  });
};

/**
 * Real-time listener for dose logs
 * Security: Only returns logs for the specified patientId
 */
export const subscribeToDoseLogs = (patientId, callback, limitCount = 50) => {
  if (!patientId) {
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  const q = query(
    collection(db, COLLECTIONS.DOSE_LOGS),
    where("patientId", "==", patientId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    let logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort and limit client-side
    logs.sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.createdAt);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    if (limitCount && logs.length > limitCount) {
      logs = logs.slice(0, limitCount);
    }

    callback(logs);
  }, (error) => {
    console.error('Error in dose logs subscription:', error);
    callback([]);
  });
};

/**
 * Calculate adherence statistics
 */
export const calculateAdherence = async (patientId, period = "week") => {
  const logs = await getDoseLogs(patientId);
  const now = new Date();
  let startDate;
  
  if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(0); // All time
  }
  
  const filteredLogs = logs.filter(log => {
    const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
    return logDate >= startDate;
  });
  
  const taken = filteredLogs.filter(log => log.status === "taken").length;
  const missed = filteredLogs.filter(log => log.status === "missed").length;
  const total = taken + missed;
  
  return {
    taken,
    missed,
    total,
    percentage: total > 0 ? Math.round((taken / total) * 100) : 0
  };
};

/**
 * Update device status (online/offline)
 */
export const updateDeviceStatus = async (patientId, status) => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, patientId);
  await updateDoc(settingsRef, {
    deviceStatus: status,
    lastSync: serverTimestamp()
  });
};

/**
 * Decrement pill count when dose is taken
 */
export const decrementPillCount = async (patientId) => {
  const settings = await getDeviceSettings(patientId);
  const newCount = Math.max(0, (settings.pillCount || 0) - 1);
  
  await updateDeviceSettings(patientId, {
    pillCount: newCount
  });
  
  return newCount;
};

