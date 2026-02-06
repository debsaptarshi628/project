// Backend API Server for Email Notifications
// Uses Nodemailer with Gmail SMTP (works immediately, no domain verification needed)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Gmail SMTP Configuration
// You can use your Gmail account or create an App Password
// To create App Password: Google Account → Security → 2-Step Verification → App Passwords
const GMAIL_USER = process.env.GMAIL_USER || 'debsaptarshi628@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'ibpuailqtknxsepv';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

// Middleware
// Allow CORS from Netlify frontend and localhost for development
const allowedOrigins = [
  'https://seniorpill.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (can restrict later)
    }
  },
  credentials: true
}));
app.use(express.json());

console.log('📧 Email Notification Server Initialized');
console.log('   Using Gmail SMTP');
console.log('   From: ' + GMAIL_USER);
console.log('');

// Email sending helper function using Nodemailer
async function sendEmail(to, subject, html) {
  if (!to) {
    console.log('No recipient email provided, skipping email.');
    return { success: false, error: 'No recipient email' };
  }

  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    
    const mailOptions = {
      from: `"SeniorPill" <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully!`);
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   To: ${to}`);
    
    return { 
      success: true, 
      data: {
        messageId: result.messageId,
        response: result.response
      },
      actualRecipient: to,
      originalRecipient: to
    };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('   Full error:', error);
    
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred'
    };
  }
}

// API Routes

// Send comprehensive reminder email with all patient details
app.post('/api/email/reminder', async (req, res) => {
  try {
    const { 
      caregiverEmail, 
      patientId, 
      doseType, 
      scheduledTime,
      morningPillCount,
      eveningPillCount,
      missedDosesToday
    } = req.body;

    if (!caregiverEmail || !patientId || !doseType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
          .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
          .missed-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 Medication Reminder</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <h2 style="margin: 0; color: #ef4444;">Time to Take Medication!</h2>
            </div>
            
            <div class="info-row">
              <span class="label">Patient ID:</span>
              <span class="value"><strong>${patientId}</strong></span>
            </div>
            <div class="info-row">
              <span class="label">Dose Type:</span>
              <span class="value">${doseType === 'morning' ? '🌅 Morning' : '🌙 Evening'}</span>
            </div>
            <div class="info-row">
              <span class="label">Scheduled Time:</span>
              <span class="value"><strong>${scheduledTime}</strong></span>
            </div>

            <div class="pill-counts">
              <div class="pill-count-box">
                <div class="label">Morning Pills</div>
                <div class="value" style="font-size: 28px; font-weight: bold; color: ${morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                  ${morningPillCount ?? 0}
                </div>
                ${morningPillCount <= 10 ? '<div style="color: #ef4444; font-size: 12px; font-weight: bold;">⚠️ Low Stock!</div>' : '<div style="color: #10b981; font-size: 12px;">In Stock</div>'}
              </div>
              <div class="pill-count-box">
                <div class="label">Evening Pills</div>
                <div class="value" style="font-size: 28px; font-weight: bold; color: ${eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                  ${eveningPillCount ?? 0}
                </div>
                ${eveningPillCount <= 10 ? '<div style="color: #ef4444; font-size: 12px; font-weight: bold;">⚠️ Low Stock!</div>' : '<div style="color: #10b981; font-size: 12px;">In Stock</div>'}
              </div>
            </div>

            ${missedDosesToday > 0 ? `
            <div class="missed-box">
              <h3 style="margin: 0; color: #ef4444;">⚠️ Missed Doses Today: ${missedDosesToday}</h3>
              <p style="margin: 10px 0 0 0;">Please check on the patient immediately.</p>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please remind patient <strong>${patientId}</strong> to take their ${doseType} medication now.
            </p>
          </div>
          <div class="footer">
            <p>SeniorPill Medication Management System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(
      caregiverEmail,
      `💊 Medication Reminder: ${patientId} - ${doseType === 'morning' ? 'Morning' : 'Evening'} Dose`,
      html
    );

    if (!result.success) {
      console.error(`Failed to send reminder email: ${result.error}`);
      return res.status(500).json({ error: result.error, success: false });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in reminder email endpoint:', error);
    res.status(500).json({ error: 'Failed to send reminder email' });
  }
});

// Send dose taken/missed email
app.post('/api/email/dose-status', async (req, res) => {
  try {
    const { 
      caregiverEmail, 
      patientId, 
      doseType, 
      status, 
      delaySeconds,
      timestamp,
      morningPillCount,
      eveningPillCount
    } = req.body;

    if (!caregiverEmail || !patientId || !doseType || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const statusText = status === 'taken' ? '✅ TAKEN' : '❌ MISSED';
    const statusColor = status === 'taken' ? '#10b981' : '#ef4444';
    const delayText = delaySeconds > 0 
      ? `${Math.floor(delaySeconds / 60)} min ${delaySeconds % 60} sec after reminder`
      : 'No delay / missed';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-box { background: ${status === 'taken' ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; }
          .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
          .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusText}</h1>
          </div>
          <div class="content">
            <div class="status-box">
              <h2 style="margin: 0; color: ${statusColor};">
                ${status === 'taken' ? 'Medication Taken Successfully' : 'Medication Missed'}
              </h2>
            </div>
            
            <div class="info-row">
              <span class="label">Patient ID:</span>
              <span class="value"><strong>${patientId}</strong></span>
            </div>
            <div class="info-row">
              <span class="label">Dose Type:</span>
              <span class="value">${doseType === 'morning' ? '🌅 Morning' : '🌙 Evening'}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value"><strong>${status.toUpperCase()}</strong></span>
            </div>
            <div class="info-row">
              <span class="label">Delay:</span>
              <span class="value">${delayText}</span>
            </div>
            <div class="info-row">
              <span class="label">Time:</span>
              <span class="value">${timestamp || new Date().toLocaleString()}</span>
            </div>

            <div class="pill-counts">
              <div class="pill-count-box">
                <div class="label">Morning Pills</div>
                <div class="value" style="font-size: 28px; font-weight: bold; color: ${morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                  ${morningPillCount ?? 0}
                </div>
                ${morningPillCount <= 10 ? '<div style="color: #ef4444; font-size: 12px; font-weight: bold;">⚠️ Low Stock!</div>' : '<div style="color: #10b981; font-size: 12px;">In Stock</div>'}
              </div>
              <div class="pill-count-box">
                <div class="label">Evening Pills</div>
                <div class="value" style="font-size: 28px; font-weight: bold; color: ${eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                  ${eveningPillCount ?? 0}
                </div>
                ${eveningPillCount <= 10 ? '<div style="color: #ef4444; font-size: 12px; font-weight: bold;">⚠️ Low Stock!</div>' : '<div style="color: #10b981; font-size: 12px;">In Stock</div>'}
              </div>
            </div>
          </div>
          <div class="footer">
            <p>SeniorPill Medication Management System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(
      caregiverEmail,
      `SeniorPill - ${status.toUpperCase()}: ${patientId} - ${doseType === 'morning' ? 'Morning' : 'Evening'} Dose`,
      html
    );

    if (!result.success) {
      console.error(`Failed to send dose status email: ${result.error}`);
      return res.status(500).json({ error: result.error, success: false });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in dose status email endpoint:', error);
    res.status(500).json({ error: 'Failed to send dose status email' });
  }
});

// Send low stock alert email
app.post('/api/email/low-stock', async (req, res) => {
  try {
    const { 
      caregiverEmail, 
      patientId, 
      doseType, 
      currentCount 
    } = req.body;

    if (!caregiverEmail || !patientId || !doseType || currentCount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; font-size: 24px; font-weight: bold; color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <h2 style="margin: 0; color: #f59e0b;">Pill Stock Running Low!</h2>
            </div>
            
            <div class="info-row">
              <span class="label">Patient ID:</span>
              <span class="value" style="font-size: 16px;"><strong>${patientId}</strong></span>
            </div>
            <div class="info-row">
              <span class="label">Dose Type:</span>
              <span class="value" style="font-size: 16px;">${doseType === 'morning' ? '🌅 Morning' : '🌙 Evening'}</span>
            </div>
            <div class="info-row">
              <span class="label">Remaining Pills:</span>
              <span class="value">${currentCount}</span>
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please refill the ${doseType} medication stock for patient <strong>${patientId}</strong>.
            </p>
          </div>
          <div class="footer">
            <p>SeniorPill Medication Management System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(
      caregiverEmail,
      `⚠️ Low Stock Alert: ${patientId} - ${doseType === 'morning' ? 'Morning' : 'Evening'} Pills`,
      html
    );

    if (!result.success) {
      console.error(`Failed to send low stock email: ${result.error}`);
      return res.status(500).json({ error: result.error, success: false });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in low stock email endpoint:', error);
    res.status(500).json({ error: 'Failed to send low stock email' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email API server is running', method: 'Gmail SMTP' });
});

// ==================== BACKGROUND REMINDER SERVICE ====================
// This service runs independently and checks all patients every minute
// Sends emails to caregivers automatically when medication is due

const FIREBASE_PROJECT_ID = 'pill-81bf4';
const FIREBASE_API_KEY = 'AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI';

// Track sent emails to avoid duplicates
const sentEmails = {
  reminders: new Set(),
  missed: new Set(),
  lowStock: new Set()
};

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get all settings documents (all patients)
async function getAllPatientSettings() {
  try {
    console.log(`\n🔍 FETCHING ALL PATIENTS FROM FIRESTORE...`);
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings`;
    console.log(`   URL: ${url}`);
    console.log(`   Project ID: ${FIREBASE_PROJECT_ID}`);
    
    const response = await axios.get(url, {
      params: { key: FIREBASE_API_KEY }
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Documents Found: ${response.data?.documents?.length || 0}`);
    
    const patients = [];
    if (response.data && response.data.documents) {
      for (const doc of response.data.documents) {
        const fields = doc.fields || {};
        const patientId = doc.name.split('/').pop();
        
        console.log(`\n   📄 Processing document: ${patientId}`);
        console.log(`   Raw fields:`, JSON.stringify(fields, null, 2));
        
        // Try different possible field formats
        let caregiverEmail = null;
        if (fields.caregiverEmail) {
          caregiverEmail = fields.caregiverEmail.stringValue || 
                          fields.caregiverEmail.value || 
                          (typeof fields.caregiverEmail === 'string' ? fields.caregiverEmail : null);
          console.log(`   ✅ caregiverEmail found in settings: ${caregiverEmail}`);
        } else {
          console.log(`   ⚠️ caregiverEmail NOT FOUND in settings document`);
        }
        
        let caregiverUID = null;
        if (fields.caregiverUID) {
          caregiverUID = fields.caregiverUID.stringValue || 
                        fields.caregiverUID.value || 
                        (typeof fields.caregiverUID === 'string' ? fields.caregiverUID : null);
          console.log(`   ✅ caregiverUID found: ${caregiverUID}`);
        }
        
        let firebaseUID = null;
        if (fields.firebaseUID) {
          firebaseUID = fields.firebaseUID.stringValue || 
                       fields.firebaseUID.value || 
                       (typeof fields.firebaseUID === 'string' ? fields.firebaseUID : null);
          console.log(`   ✅ firebaseUID found: ${firebaseUID}`);
        }
        
        // FALLBACK: If caregiverEmail is missing, try to get it from users collection
        if (!caregiverEmail) {
          console.log(`   🔍 FALLBACK: Attempting to find caregiver email from users collection...`);
          
          // Method 1: If we have caregiverUID, look it up directly
          if (caregiverUID) {
            try {
              console.log(`   🔍 Method 1: Looking up caregiver by UID: ${caregiverUID}`);
              const userUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${caregiverUID}`;
              const userResponse = await axios.get(userUrl, {
                params: { key: FIREBASE_API_KEY }
              });
              
              if (userResponse.data && userResponse.data.fields) {
                const userFields = userResponse.data.fields;
                caregiverEmail = userFields.email?.stringValue || 
                                userFields.email?.value || 
                                (typeof userFields.email === 'string' ? userFields.email : null);
                if (caregiverEmail) {
                  console.log(`   ✅✅✅ FOUND caregiver email via caregiverUID: ${caregiverEmail}`);
                }
              }
            } catch (err) {
              console.log(`   ⚠️ Method 1 failed: ${err.message}`);
            }
          }
          
          // Method 2: Query all users with role='caregiver' and use first one as fallback
          if (!caregiverEmail) {
            try {
              console.log(`   🔍 Method 2: Querying all caregivers from users collection...`);
              const usersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users`;
              const usersResponse = await axios.get(usersUrl, {
                params: { key: FIREBASE_API_KEY, pageSize: 100 }
              });
              
              if (usersResponse.data && usersResponse.data.documents) {
                // Find first caregiver
                for (const userDoc of usersResponse.data.documents) {
                  const userFields = userDoc.fields || {};
                  const userRole = userFields.role?.stringValue || userFields.role?.value;
                  
                  if (userRole === 'caregiver') {
                    const userEmail = userFields.email?.stringValue || 
                                    userFields.email?.value || 
                                    (typeof userFields.email === 'string' ? userFields.email : null);
                    const userId = userDoc.name.split('/').pop();
                    
                    if (userEmail && !caregiverEmail) {
                      caregiverEmail = userEmail;
                      caregiverUID = userId;
                      console.log(`   ✅✅✅ FALLBACK: Using first caregiver found: ${userEmail} (UID: ${userId})`);
                      console.log(`   ⚠️⚠️⚠️ IMPORTANT: Please update settings/{${patientId}} with caregiverEmail: "${userEmail}" and caregiverUID: "${userId}"`);
                      break;
                    }
                  }
                }
              }
            } catch (err) {
              console.log(`   ⚠️ Method 2 failed: ${err.message}`);
            }
          }
          
          if (!caregiverEmail) {
            console.log(`   ❌❌❌ Could not find caregiver email using any method!`);
            console.log(`   💡 SOLUTION: Update settings/{${patientId}} in Firestore with caregiverEmail field`);
          }
        }
        
        const patient = {
          id: patientId,
          customUID: patientId,
          caregiverEmail: caregiverEmail,
          caregiverUID: caregiverUID,
          morningDoseTime: fields.morningDoseTime?.stringValue || null,
          eveningDoseTime: fields.eveningDoseTime?.stringValue || null,
          morningPillCount: fields.morningPillCount?.integerValue ? parseInt(fields.morningPillCount.integerValue) : 0,
          eveningPillCount: fields.eveningPillCount?.integerValue ? parseInt(fields.eveningPillCount.integerValue) : 0
        };
        
        console.log(`   ✅ Extracted caregiverEmail: ${patient.caregiverEmail || '❌ NOT FOUND'}`);
        console.log(`   ✅ Extracted morningDoseTime: ${patient.morningDoseTime || '❌ NOT FOUND'}`);
        console.log(`   ✅ Extracted eveningDoseTime: ${patient.eveningDoseTime || '❌ NOT FOUND'}`);
        
        patients.push(patient);
      }
    }
    
    console.log(`\n✅ Total patients loaded: ${patients.length}`);
    return patients;
  } catch (error) {
    console.error('❌ Error fetching patient settings:', error.message);
    console.error('   Full error:', error.response?.data || error);
    return [];
  }
}

// Get dose logs for a patient
async function getDoseLogs(patientId) {
  try {
    // Fetch all dose logs and filter by patientId (simpler approach)
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/doseLogs`;
    const response = await axios.get(url, {
      params: { key: FIREBASE_API_KEY, pageSize: 100 }
    });
    
    const logs = [];
    if (response.data && response.data.documents) {
      for (const doc of response.data.documents) {
        const fields = doc.fields || {};
        const logPatientId = fields.patientId?.stringValue;
        
        // Filter by patientId
        if (logPatientId === patientId) {
          const timestamp = fields.timestamp?.timestampValue || fields.createdAt?.stringValue;
          
          logs.push({
            id: doc.name.split('/').pop(),
            patientId: logPatientId,
            doseType: fields.doseType?.stringValue || '',
            status: fields.status?.stringValue || '',
            delaySeconds: fields.delaySeconds?.integerValue ? parseInt(fields.delaySeconds.integerValue) : 0,
            timestamp: timestamp,
            createdAt: fields.createdAt?.stringValue || timestamp
          });
        }
      }
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    return logs;
  } catch (error) {
    console.error(`❌ Error fetching dose logs for ${patientId}:`, error.message);
    return [];
  }
}

// Check all patients and send reminder emails
async function checkAllPatientReminders() {
  try {
    const patients = await getAllPatientSettings();
    
    if (patients.length === 0) {
      console.log('⚠️ No patients found in database');
      return;
    }
    
    console.log(`\n🔍 Checking ${patients.length} patient(s) for reminders...`);
    
    const now = new Date();
    const today = formatDate(now);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentSec = now.getSeconds();
    
    for (const patient of patients) {
      const pId = patient.customUID || patient.id;
      
      // DEBUG: Show all patient data
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 PATIENT DATA for ${pId}:`);
      console.log(`   ID: ${patient.id}`);
      console.log(`   Custom UID: ${patient.customUID}`);
      console.log(`   Caregiver Email: ${patient.caregiverEmail || '❌ NOT FOUND'}`);
      console.log(`   Caregiver UID: ${patient.caregiverUID || 'N/A'}`);
      console.log(`   Morning Dose Time: ${patient.morningDoseTime || '❌ NOT SET'}`);
      console.log(`   Evening Dose Time: ${patient.eveningDoseTime || '❌ NOT SET'}`);
      console.log(`   Morning Pill Count: ${patient.morningPillCount}`);
      console.log(`   Evening Pill Count: ${patient.eveningPillCount}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      const caregiverEmail = patient.caregiverEmail;
      
      if (!caregiverEmail) {
        console.log(`❌ SKIPPING Patient ${pId}: No caregiver email found`);
        console.log(`   Full patient object:`, JSON.stringify(patient, null, 2));
        continue; // Skip if no caregiver email
      }
      
      console.log(`✅ Patient ${pId} has caregiver email: ${caregiverEmail}`);
      
      if (!patient.morningDoseTime || !patient.eveningDoseTime) {
        console.log(`❌ SKIPPING Patient ${pId}: Dose times not set`);
        console.log(`   Morning: ${patient.morningDoseTime || 'MISSING'}`);
        console.log(`   Evening: ${patient.eveningDoseTime || 'MISSING'}`);
        continue; // Skip if times not set
      }
      
      // Parse dose times
      const [morningHour, morningMin] = patient.morningDoseTime.split(':').map(Number);
      const [eveningHour, eveningMin] = patient.eveningDoseTime.split(':').map(Number);
      
      console.log(`\n⏰ TIME CHECK for Patient ${pId}:`);
      console.log(`   Current Time: ${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}:${String(currentSec).padStart(2, '0')}`);
      console.log(`   Morning Scheduled: ${String(morningHour).padStart(2, '0')}:${String(morningMin).padStart(2, '0')}`);
      console.log(`   Evening Scheduled: ${String(eveningHour).padStart(2, '0')}:${String(eveningMin).padStart(2, '0')}`);
      
      // Get dose logs
      console.log(`\n📊 Fetching dose logs for ${pId}...`);
      const patientLogs = await getDoseLogs(pId);
      console.log(`   Found ${patientLogs.length} dose log(s)`);
      
      // Get missed doses today
      const missedToday = patientLogs.filter(log => {
        const logDate = log.timestamp ? formatDate(new Date(log.timestamp)) : formatDate(new Date(log.createdAt));
        return logDate === today && log.status === 'missed';
      });
      console.log(`   Missed doses today: ${missedToday.length}`);
      
      // Check morning reminder - send at exact time or within 1 minute after
      const morningDiffMinutes = (currentHour * 60 + currentMin) - (morningHour * 60 + morningMin);
      const morningExactMatch = (currentHour === morningHour && currentMin === morningMin);
      
      console.log(`\n🌅 MORNING REMINDER CHECK:`);
      console.log(`   Current: ${currentHour}:${currentMin}:${currentSec}`);
      console.log(`   Scheduled: ${morningHour}:${morningMin}`);
      console.log(`   Difference: ${morningDiffMinutes} minutes`);
      console.log(`   Exact Match: ${morningExactMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Within Window: ${morningExactMatch || (morningDiffMinutes >= 0 && morningDiffMinutes <= 1) ? '✅ YES' : '❌ NO'}`);
      
      // Check if already logged today (taken or missed)
      const todayMorningLog = patientLogs.find(log => {
        const logDate = log.timestamp ? formatDate(new Date(log.timestamp)) : formatDate(new Date(log.createdAt));
        return logDate === today && log.doseType === 'morning';
      });
      
      // Check for missed dose - if it's been 2+ minutes after scheduled time and no log exists
      const morningMissed = morningDiffMinutes >= 2 && morningDiffMinutes <= 5 && !todayMorningLog;
      
      // Use a more unique key to prevent duplicates (include hour:minute)
      const morningReminderKey = `${pId}-morning-${today}-${morningHour}:${morningMin}`;
      const morningMissedKey = `${pId}-missed-morning-${today}`;
      
      console.log(`   Already logged today: ${todayMorningLog ? `✅ YES (${todayMorningLog.status})` : '❌ NO'}`);
      console.log(`   Already sent reminder: ${sentEmails.reminders.has(morningReminderKey) ? '✅ YES' : '❌ NO'}`);
      console.log(`   Already sent missed: ${sentEmails.missed.has(morningMissedKey) ? '✅ YES' : '❌ NO'}`);
      console.log(`   Missed check (2-5 min after): ${morningMissed ? '✅ YES - DOSE MISSED!' : '❌ NO'}`);
      
      // Send missed dose email if not taken within 2-5 minutes after scheduled time
      if (morningMissed && !sentEmails.missed.has(morningMissedKey)) {
        sentEmails.missed.add(morningMissedKey);
        
        console.log(`\n🚨🚨🚨 MISSED DOSE DETECTED! 🚨🚨🚨`);
        console.log(`   Patient: ${pId}`);
        console.log(`   Dose Type: Morning`);
        console.log(`   Scheduled Time: ${patient.morningDoseTime}`);
        console.log(`   Current Time: ${currentHour}:${currentMin}`);
        console.log(`   Caregiver Email: ${caregiverEmail}`);
        console.log(`\n📧 PREPARING MISSED DOSE EMAIL...\n`);
        
        const missedHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .status-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
              .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #111827; }
              .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
              .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>❌ Medication Missed</h1>
              </div>
              <div class="content">
                <div class="status-box">
                  <h2 style="margin: 0; color: #ef4444;">Medication Missed - Action Required!</h2>
                </div>
                <div class="info-row">
                  <span class="label">Patient ID:</span>
                  <span class="value"><strong>${pId}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Dose Type:</span>
                  <span class="value">🌅 Morning</span>
                </div>
                <div class="info-row">
                  <span class="label">Scheduled Time:</span>
                  <span class="value"><strong>${patient.morningDoseTime}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Current Time:</span>
                  <span class="value">${currentHour}:${String(currentMin).padStart(2, '0')}</span>
                </div>
                <div class="pill-counts">
                  <div class="pill-count-box">
                    <div class="label">Morning Pills</div>
                    <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                      ${patient.morningPillCount}
                    </div>
                  </div>
                  <div class="pill-count-box">
                    <div class="label">Evening Pills</div>
                    <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                      ${patient.eveningPillCount}
                    </div>
                  </div>
                </div>
                <p style="margin-top: 20px; color: #ef4444; font-weight: bold;">
                  ⚠️ Patient <strong>${pId}</strong> did not take their morning medication at the scheduled time (${patient.morningDoseTime}). Please check on them immediately.
                </p>
              </div>
              <div class="footer">
                <p>SeniorPill Medication Management System</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        console.log(`📤 SENDING MISSED DOSE EMAIL...`);
        console.log(`   To: ${caregiverEmail}`);
        console.log(`   Subject: ❌ Medication Missed: ${pId} - Morning Dose`);
        
        const missedEmailResult = await sendEmail(
          caregiverEmail,
          `❌ Medication Missed: ${pId} - Morning Dose`,
          missedHtml
        );
        
        console.log(`\n📬 MISSED DOSE EMAIL RESULT:`);
        console.log(`   Success: ${missedEmailResult.success ? '✅ YES' : '❌ NO'}`);
        if (missedEmailResult.success) {
          console.log(`   Message ID: ${missedEmailResult.data?.messageId || 'N/A'}`);
          console.log(`✅✅✅ MISSED DOSE EMAIL SENT SUCCESSFULLY TO ${caregiverEmail} ✅✅✅`);
        } else {
          console.error(`   Error: ${missedEmailResult.error}`);
          console.error(`❌❌❌ MISSED DOSE EMAIL FAILED ❌❌❌`);
          sentEmails.missed.delete(morningMissedKey);
        }
        console.log(`\n`);
      }
      
      // Send reminder email at scheduled time (only if not already sent and not taken)
      if ((morningExactMatch || (morningDiffMinutes >= 0 && morningDiffMinutes <= 1)) && !todayMorningLog && !sentEmails.reminders.has(morningReminderKey)) {
        sentEmails.reminders.add(morningReminderKey);
        
        console.log(`\n🚨🚨🚨 REMINDER TRIGGERED! 🚨🚨🚨`);
        console.log(`   Patient: ${pId}`);
        console.log(`   Dose Type: Morning`);
        console.log(`   Scheduled Time: ${patient.morningDoseTime}`);
        console.log(`   Caregiver Email: ${caregiverEmail}`);
        console.log(`   Morning Pills: ${patient.morningPillCount}`);
        console.log(`   Evening Pills: ${patient.eveningPillCount}`);
        console.log(`   Missed Today: ${missedToday.length}`);
        console.log(`\n📧 PREPARING EMAIL...\n`);
        
        // Send reminder email
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
                .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
                .missed-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💊 Medication Reminder</h1>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <h2 style="margin: 0; color: #ef4444;">Time to Take Medication!</h2>
                  </div>
                  <div class="info-row">
                    <span class="label">Patient ID:</span>
                    <span class="value"><strong>${pId}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Dose Type:</span>
                    <span class="value">🌅 Morning</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Scheduled Time:</span>
                    <span class="value"><strong>${patient.morningDoseTime}</strong></span>
                  </div>
                  <div class="pill-counts">
                    <div class="pill-count-box">
                      <div class="label">Morning Pills</div>
                      <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                        ${patient.morningPillCount}
                      </div>
                    </div>
                    <div class="pill-count-box">
                      <div class="label">Evening Pills</div>
                      <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                        ${patient.eveningPillCount}
                      </div>
                    </div>
                  </div>
                  ${missedToday.length > 0 ? `
                  <div class="missed-box">
                    <h3 style="margin: 0; color: #ef4444;">⚠️ Missed Doses Today: ${missedToday.length}</h3>
                    <p style="margin: 10px 0 0 0;">Please check on the patient immediately.</p>
                  </div>
                  ` : ''}
                  <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Please remind patient <strong>${pId}</strong> to take their morning medication now.
                  </p>
                </div>
                <div class="footer">
                  <p>SeniorPill Medication Management System</p>
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
        `;
        
        console.log(`📤 SENDING EMAIL...`);
        console.log(`   To: ${caregiverEmail}`);
        console.log(`   Subject: 💊 Medication Reminder: ${pId} - Morning Dose`);
        
        const emailResult = await sendEmail(
          caregiverEmail,
          `💊 Medication Reminder: ${pId} - Morning Dose`,
          html
        );
        
        console.log(`\n📬 EMAIL RESULT:`);
        console.log(`   Success: ${emailResult.success ? '✅ YES' : '❌ NO'}`);
        if (emailResult.success) {
          console.log(`   Message ID: ${emailResult.data?.messageId || 'N/A'}`);
          console.log(`   Response: ${emailResult.data?.response || 'N/A'}`);
          console.log(`✅✅✅ EMAIL SENT SUCCESSFULLY TO ${caregiverEmail} ✅✅✅`);
        } else {
          console.error(`   Error: ${emailResult.error}`);
          console.error(`❌❌❌ EMAIL FAILED ❌❌❌`);
          sentEmails.reminders.delete(morningReminderKey);
        }
        console.log(`\n`);
      }
      
      // Check evening reminder - send at exact time or within 1 minute after
      const eveningDiffMinutes = (currentHour * 60 + currentMin) - (eveningHour * 60 + eveningMin);
      const eveningExactMatch = (currentHour === eveningHour && currentMin === eveningMin);
      
      console.log(`\n🌙 EVENING REMINDER CHECK:`);
      console.log(`   Current: ${currentHour}:${currentMin}:${currentSec}`);
      console.log(`   Scheduled: ${eveningHour}:${eveningMin}`);
      console.log(`   Difference: ${eveningDiffMinutes} minutes`);
      console.log(`   Exact Match: ${eveningExactMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Within Window: ${eveningExactMatch || (eveningDiffMinutes >= 0 && eveningDiffMinutes <= 1) ? '✅ YES' : '❌ NO'}`);
      
      // Check if already logged today (taken or missed)
      const todayEveningLog = patientLogs.find(log => {
        const logDate = log.timestamp ? formatDate(new Date(log.timestamp)) : formatDate(new Date(log.createdAt));
        return logDate === today && log.doseType === 'evening';
      });
      
      // Check for missed dose - if it's been 2+ minutes after scheduled time and no log exists
      const eveningMissed = eveningDiffMinutes >= 2 && eveningDiffMinutes <= 5 && !todayEveningLog;
      
      // Use a more unique key to prevent duplicates (include hour:minute)
      const eveningReminderKey = `${pId}-evening-${today}-${eveningHour}:${eveningMin}`;
      const eveningMissedKey = `${pId}-missed-evening-${today}`;
      
      console.log(`   Already logged today: ${todayEveningLog ? `✅ YES (${todayEveningLog.status})` : '❌ NO'}`);
      console.log(`   Already sent reminder: ${sentEmails.reminders.has(eveningReminderKey) ? '✅ YES' : '❌ NO'}`);
      console.log(`   Already sent missed: ${sentEmails.missed.has(eveningMissedKey) ? '✅ YES' : '❌ NO'}`);
      console.log(`   Missed check (2-5 min after): ${eveningMissed ? '✅ YES - DOSE MISSED!' : '❌ NO'}`);
      
      // Send missed dose email if not taken within 2-5 minutes after scheduled time
      if (eveningMissed && !sentEmails.missed.has(eveningMissedKey)) {
        sentEmails.missed.add(eveningMissedKey);
        
        console.log(`\n🚨🚨🚨 MISSED DOSE DETECTED! 🚨🚨🚨`);
        console.log(`   Patient: ${pId}`);
        console.log(`   Dose Type: Evening`);
        console.log(`   Scheduled Time: ${patient.eveningDoseTime}`);
        console.log(`   Current Time: ${currentHour}:${currentMin}`);
        console.log(`   Caregiver Email: ${caregiverEmail}`);
        console.log(`\n📧 PREPARING MISSED DOSE EMAIL...\n`);
        
        const missedHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .status-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
              .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #111827; }
              .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
              .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>❌ Medication Missed</h1>
              </div>
              <div class="content">
                <div class="status-box">
                  <h2 style="margin: 0; color: #ef4444;">Medication Missed - Action Required!</h2>
                </div>
                <div class="info-row">
                  <span class="label">Patient ID:</span>
                  <span class="value"><strong>${pId}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Dose Type:</span>
                  <span class="value">🌙 Evening</span>
                </div>
                <div class="info-row">
                  <span class="label">Scheduled Time:</span>
                  <span class="value"><strong>${patient.eveningDoseTime}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Current Time:</span>
                  <span class="value">${currentHour}:${String(currentMin).padStart(2, '0')}</span>
                </div>
                <div class="pill-counts">
                  <div class="pill-count-box">
                    <div class="label">Morning Pills</div>
                    <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                      ${patient.morningPillCount}
                    </div>
                  </div>
                  <div class="pill-count-box">
                    <div class="label">Evening Pills</div>
                    <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                      ${patient.eveningPillCount}
                    </div>
                  </div>
                </div>
                <p style="margin-top: 20px; color: #ef4444; font-weight: bold;">
                  ⚠️ Patient <strong>${pId}</strong> did not take their evening medication at the scheduled time (${patient.eveningDoseTime}). Please check on them immediately.
                </p>
              </div>
              <div class="footer">
                <p>SeniorPill Medication Management System</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        console.log(`📤 SENDING MISSED DOSE EMAIL...`);
        console.log(`   To: ${caregiverEmail}`);
        console.log(`   Subject: ❌ Medication Missed: ${pId} - Evening Dose`);
        
        const missedEmailResult = await sendEmail(
          caregiverEmail,
          `❌ Medication Missed: ${pId} - Evening Dose`,
          missedHtml
        );
        
        console.log(`\n📬 MISSED DOSE EMAIL RESULT:`);
        console.log(`   Success: ${missedEmailResult.success ? '✅ YES' : '❌ NO'}`);
        if (missedEmailResult.success) {
          console.log(`   Message ID: ${missedEmailResult.data?.messageId || 'N/A'}`);
          console.log(`✅✅✅ MISSED DOSE EMAIL SENT SUCCESSFULLY TO ${caregiverEmail} ✅✅✅`);
        } else {
          console.error(`   Error: ${missedEmailResult.error}`);
          console.error(`❌❌❌ MISSED DOSE EMAIL FAILED ❌❌❌`);
          sentEmails.missed.delete(eveningMissedKey);
        }
        console.log(`\n`);
      }
      
      // Send reminder email at scheduled time (only if not already sent and not taken)
      if ((eveningExactMatch || (eveningDiffMinutes >= 0 && eveningDiffMinutes <= 1)) && !todayEveningLog && !sentEmails.reminders.has(eveningReminderKey)) {
        sentEmails.reminders.add(eveningReminderKey);
          
          console.log(`\n🚨🚨🚨 REMINDER TRIGGERED! 🚨🚨🚨`);
          console.log(`   Patient: ${pId}`);
          console.log(`   Dose Type: Evening`);
          console.log(`   Scheduled Time: ${patient.eveningDoseTime}`);
          console.log(`   Caregiver Email: ${caregiverEmail}`);
          console.log(`   Morning Pills: ${patient.morningPillCount}`);
          console.log(`   Evening Pills: ${patient.eveningPillCount}`);
          console.log(`   Missed Today: ${missedToday.length}`);
          console.log(`\n📧 PREPARING EMAIL...\n`);
          
          // Send reminder email
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .pill-counts { display: flex; gap: 20px; margin: 20px 0; }
                .pill-count-box { flex: 1; background: white; padding: 15px; border-radius: 8px; border: 2px solid #e5e7eb; text-align: center; }
                .missed-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💊 Medication Reminder</h1>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <h2 style="margin: 0; color: #ef4444;">Time to Take Medication!</h2>
                  </div>
                  <div class="info-row">
                    <span class="label">Patient ID:</span>
                    <span class="value"><strong>${pId}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Dose Type:</span>
                    <span class="value">🌙 Evening</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Scheduled Time:</span>
                    <span class="value"><strong>${patient.eveningDoseTime}</strong></span>
                  </div>
                  <div class="pill-counts">
                    <div class="pill-count-box">
                      <div class="label">Morning Pills</div>
                      <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.morningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                        ${patient.morningPillCount}
                      </div>
                    </div>
                    <div class="pill-count-box">
                      <div class="label">Evening Pills</div>
                      <div class="value" style="font-size: 28px; font-weight: bold; color: ${patient.eveningPillCount <= 10 ? '#ef4444' : '#10b981'}; margin: 10px 0;">
                        ${patient.eveningPillCount}
                      </div>
                    </div>
                  </div>
                  ${missedToday.length > 0 ? `
                  <div class="missed-box">
                    <h3 style="margin: 0; color: #ef4444;">⚠️ Missed Doses Today: ${missedToday.length}</h3>
                    <p style="margin: 10px 0 0 0;">Please check on the patient immediately.</p>
                  </div>
                  ` : ''}
                  <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Please remind patient <strong>${pId}</strong> to take their evening medication now.
                  </p>
                </div>
                <div class="footer">
                  <p>SeniorPill Medication Management System</p>
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          console.log(`📤 SENDING EMAIL...`);
          console.log(`   To: ${caregiverEmail}`);
          console.log(`   Subject: 💊 Medication Reminder: ${pId} - Evening Dose`);
          
          const emailResult = await sendEmail(
            caregiverEmail,
            `💊 Medication Reminder: ${pId} - Evening Dose`,
            html
          );
          
          console.log(`\n📬 EMAIL RESULT:`);
          console.log(`   Success: ${emailResult.success ? '✅ YES' : '❌ NO'}`);
          if (emailResult.success) {
            console.log(`   Message ID: ${emailResult.data?.messageId || 'N/A'}`);
            console.log(`   Response: ${emailResult.data?.response || 'N/A'}`);
            console.log(`✅✅✅ EMAIL SENT SUCCESSFULLY TO ${caregiverEmail} ✅✅✅`);
          } else {
          console.error(`   Error: ${emailResult.error}`);
          console.error(`❌❌❌ EMAIL FAILED ❌❌❌`);
          sentEmails.reminders.delete(eveningReminderKey);
        }
        console.log(`\n`);
      }
      
      // Note: Missed dose detection is now handled above in the morning/evening reminder checks
      // This section is kept for any missed logs that come from the database directly
      for (const missedLog of missedToday) {
        const missedKey = `${pId}-missed-log-${missedLog.id}`;
        if (!sentEmails.missed.has(missedKey)) {
          sentEmails.missed.add(missedKey);
          
          console.log(`📧 Sending MISSED dose email (from log) to ${caregiverEmail} for patient ${pId}`);
          
          const logDate = missedLog.timestamp ? new Date(missedLog.timestamp) : new Date(missedLog.createdAt);
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .status-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>❌ Medication Missed</h1>
                </div>
                <div class="content">
                  <div class="status-box">
                    <h2 style="margin: 0; color: #ef4444;">Medication Missed</h2>
                  </div>
                  <div class="info-row">
                    <span class="label">Patient ID:</span>
                    <span class="value"><strong>${pId}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Dose Type:</span>
                    <span class="value">${missedLog.doseType === 'morning' ? '🌅 Morning' : '🌙 Evening'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Time:</span>
                    <span class="value">${logDate.toLocaleString()}</span>
                  </div>
                  <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Patient <strong>${pId}</strong> missed their ${missedLog.doseType} medication. Please check on them immediately.
                  </p>
                </div>
                <div class="footer">
                  <p>SeniorPill Medication Management System</p>
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          sendEmail(
            caregiverEmail,
            `❌ Medication Missed: ${pId} - ${missedLog.doseType === 'morning' ? 'Morning' : 'Evening'} Dose`,
            html
          ).catch(err => console.error(`❌ Failed to send missed dose email:`, err));
        }
      }
      
      // Check low stock (for both morning and evening)
      if (patient.morningPillCount > 0 && patient.morningPillCount <= 10) {
        const lowStockKey = `${pId}-lowstock-morning-${today}`;
        if (!sentEmails.lowStock.has(lowStockKey)) {
          sentEmails.lowStock.add(lowStockKey);
          console.log(`📧 Sending LOW STOCK email to ${caregiverEmail} for patient ${pId} - Morning pills: ${patient.morningPillCount}`);
          
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; font-size: 24px; font-weight: bold; color: #ef4444; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Low Stock Alert</h1>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <h2 style="margin: 0; color: #f59e0b;">Pill Stock Running Low!</h2>
                  </div>
                  <div class="info-row">
                    <span class="label">Patient ID:</span>
                    <span class="value" style="font-size: 16px;"><strong>${pId}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Dose Type:</span>
                    <span class="value" style="font-size: 16px;">🌅 Morning</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Remaining Pills:</span>
                    <span class="value">${patient.morningPillCount}</span>
                  </div>
                  <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Please refill the morning medication stock for patient <strong>${pId}</strong>.
                  </p>
                </div>
                <div class="footer">
                  <p>SeniorPill Medication Management System</p>
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          sendEmail(
            caregiverEmail,
            `⚠️ Low Stock Alert: ${pId} - Morning Pills`,
            html
          ).catch(err => console.error(`❌ Failed to send low stock email:`, err));
        }
      }
      
      if (patient.eveningPillCount > 0 && patient.eveningPillCount <= 10) {
        const lowStockKey = `${pId}-lowstock-evening-${today}`;
        if (!sentEmails.lowStock.has(lowStockKey)) {
          sentEmails.lowStock.add(lowStockKey);
          console.log(`📧 Sending LOW STOCK email to ${caregiverEmail} for patient ${pId} - Evening pills: ${patient.eveningPillCount}`);
          
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; font-size: 24px; font-weight: bold; color: #ef4444; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ Low Stock Alert</h1>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <h2 style="margin: 0; color: #f59e0b;">Pill Stock Running Low!</h2>
                  </div>
                  <div class="info-row">
                    <span class="label">Patient ID:</span>
                    <span class="value" style="font-size: 16px;"><strong>${pId}</strong></span>
                  </div>
                  <div class="info-row">
                    <span class="label">Dose Type:</span>
                    <span class="value" style="font-size: 16px;">🌙 Evening</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Remaining Pills:</span>
                    <span class="value">${patient.eveningPillCount}</span>
                  </div>
                  <p style="margin-top: 20px;">
                    <strong>Action Required:</strong> Please refill the evening medication stock for patient <strong>${pId}</strong>.
                  </p>
                </div>
                <div class="footer">
                  <p>SeniorPill Medication Management System</p>
                  <p>This is an automated notification. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          sendEmail(
            caregiverEmail,
            `⚠️ Low Stock Alert: ${pId} - Evening Pills`,
            html
          ).catch(err => console.error(`❌ Failed to send low stock email:`, err));
        }
      }
    }
    
    // Clear old sent emails (older than 1 day) to prevent memory buildup
    if (sentEmails.reminders.size > 1000) {
      sentEmails.reminders.clear();
      sentEmails.missed.clear();
      sentEmails.lowStock.clear();
    }
  } catch (error) {
    console.error('❌ Error in background reminder check:', error);
  }
}

// Start background reminder service - checks every 10 seconds for instant notifications
setInterval(checkAllPatientReminders, 10000); // 10 seconds for instant emails
checkAllPatientReminders(); // Run immediately on startup

console.log('✅ Background reminder service started - checking all patients every 10 seconds');

// Start server
app.listen(PORT, () => {
  console.log(`Email API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
