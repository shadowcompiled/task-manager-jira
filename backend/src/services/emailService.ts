import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Ensure env vars are loaded
dotenv.config();

// Configure your email service here
// For development, use a service like Mailtrap or Gmail
function createTransporter() {
  const config: any = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || '',
    },
    // Better timeout settings for cloud environments
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    // Disable connection pooling for serverless
    pool: false,
    // Debug logging
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
  };

  // Try TLS settings for Gmail
  if (config.host === 'smtp.gmail.com' && config.port === 587) {
    config.tls = {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    };
  }

  return nodemailer.createTransport(config);
}

// Lazy initialization
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

export interface EmailNotification {
  recipientEmail: string;
  taskTitle: string;
  taskId: number;
  dueDate: string;
  assignedTo: string;
  restaurantName: string;
}

export async function sendExpirationNotification(
  notification: EmailNotification
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log(
      '⚠️  Email notifications disabled - EMAIL_USER not configured'
    );
    return false;
  }

  try {
    const dueDate = new Date(notification.dueDate);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysRemaining < 0;
    const daysOverdue = Math.abs(daysRemaining);

    // Different subject and styling based on urgency
    const subject = isOverdue 
      ? `🚨 משימה באיחור! ${notification.taskTitle}`
      : `⏰ תזכורת יומית: ${notification.taskTitle}`;
    
    const statusText = isOverdue
      ? `<span style="color: #d32f2f; font-weight: bold;">באיחור ${daysOverdue} ימים!</span>`
      : `<span style="color: #ff9800; font-weight: bold;">${daysRemaining} ימים נותרים</span>`;

    const headerColor = isOverdue ? '#d32f2f' : '#ff9800';
    const headerText = isOverdue ? '🚨 משימה באיחור!' : '⏰ משימה עומדת לפוג';

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: notification.recipientEmail,
      subject: subject,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2 style="color: ${headerColor};">${headerText}</h2>
          <p>שלום ${notification.assignedTo},</p>
          <p>${isOverdue 
            ? 'המשימה הבאה <b>חרגה מתאריך היעד</b> ודורשת טיפול מיידי:'
            : 'זוהי תזכורת יומית - המשימה הבאה עומדת לפוג בקרוב:'
          }</p>
          
          <div style="background-color: ${isOverdue ? '#ffebee' : '#fff3e0'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid ${headerColor};">
            <p><strong>📋 שם המשימה:</strong> ${notification.taskTitle}</p>
            <p><strong>📅 תאריך יעד:</strong> ${dueDate.toLocaleDateString('he-IL')}</p>
            <p><strong>⏱️ סטטוס:</strong> ${statusText}</p>
            <p><strong>🏢 מסעדה:</strong> ${notification.restaurantName}</p>
          </div>

          <p style="color: #666;">
            ${isOverdue 
              ? '⚠️ <b>חשוב:</b> תקבל תזכורת יומית עד שהמשימה תושלם.'
              : '💡 <b>טיפ:</b> השלם את המשימה כדי להפסיק לקבל תזכורות.'
            }
          </p>
          
          <p>בברכה,<br/>מערכת ניהול המשימות</p>
        </div>
      `,
      text: `
${isOverdue ? 'משימה באיחור!' : 'תזכורת יומית'}
משימה: ${notification.taskTitle}
תאריך יעד: ${dueDate.toLocaleDateString('he-IL')}
${isOverdue ? `באיחור ${daysOverdue} ימים` : `נותרו ${daysRemaining} ימים`}
אנא עדכן את סטטוס המשימה.
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(
      `✉️  ${isOverdue ? 'OVERDUE' : 'Expiration'} notification sent to ${notification.recipientEmail}`
    );
    return true;
  } catch (error: any) {
    console.error('Failed to send expiration notification:', error.message);
    return false;
  }
}

export async function sendAssignmentNotification(
  recipientEmail: string,
  taskTitle: string,
  assignedByName: string,
  restaurantName: string
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log(
      '⚠️  Email notifications disabled - EMAIL_USER not configured'
    );
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `📋 נוספה לך משימה חדשה: ${taskTitle}`,
      html: `
        <h2>נוספה לך משימה חדשה</h2>
        <p>שלום,</p>
        <p>${assignedByName} הקציא לך משימה חדשה:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>שם המשימה:</strong> ${taskTitle}</p>
          <p><strong>הוקצתה על ידי:</strong> ${assignedByName}</p>
          <p><strong>מסעדה:</strong> ${restaurantName}</p>
        </div>

        <p>אנא בדוק את פרטי המשימה ותחל בביצוע שלה.</p>
        
        <p>בברכה,<br/>מערכת ניהול המשימות</p>
      `,
      text: `
משימה חדשה נוספה לך: ${taskTitle}
הוקצתה על ידי: ${assignedByName}
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✉️  Assignment notification sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send assignment notification:', error.message);
    return false;
  }
}

export async function sendUserApprovalEmail(
  recipientEmail: string,
  userName: string
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log(
      '⚠️  Email notifications disabled - EMAIL_USER not configured'
    );
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '✅ בקשת ההרשמה שלך אושרה',
      html: `
        <h2>ברוכים הבאים!</h2>
        <p>שלום ${userName},</p>
        <p>אנחנו שמחים להודיע לך כי בקשת ההרשמה שלך <strong>אושרה</strong> בהצלחה! 🎉</p>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4caf50;">
          <p><strong>אתה יכול כעת להתחבר למערכת</strong></p>
          <p>כתובת דוא"ל: ${recipientEmail}</p>
        </div>

        <p><strong>הצעדים הבאים:</strong></p>
        <ul>
          <li>היכנס למערכת עם כתובת הדוא"ל שלך וסיסמתך</li>
          <li>בדוק את לוח המשימות שלך</li>
          <li>התחל לעבוד על המשימות שהוקצו לך</li>
        </ul>

        <p>אם יש לך שאלות או בעיות, אנא צור קשר עם הנהלה.</p>
        
        <p>בברכה,<br/>צוות מערכת ניהול המשימות</p>
      `,
      text: `
בקשת ההרשמה שלך אושרה בהצלחה!
אתה יכול כעת להתחבר למערכת עם כתובת הדוא"ל ${recipientEmail} וסיסמתך.
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✉️  User approval email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send approval email:', error.message);
    return false;
  }
}

export async function sendUserDenialEmail(
  recipientEmail: string,
  userName: string,
  reason?: string
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log(
      '⚠️  Email notifications disabled - EMAIL_USER not configured'
    );
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '❌ בקשת ההרשמה שלך נדחתה',
      html: `
        <h2>בקשת ההרשמה</h2>
        <p>שלום ${userName},</p>
        <p>לצערנו, בקשת ההרשמה שלך <strong>נדחתה</strong>.</p>
        
        <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f44336;">
          ${reason ? `<p><strong>הסיבה:</strong> ${reason}</p>` : ''}
          <p>אם אתה חושב שזה שגיאה, אנא צור קשר עם הנהלה.</p>
        </div>

        <p>בברכה,<br/>צוות מערכת ניהול המשימות</p>
      `,
      text: `
לצערנו, בקשת ההרשמה שלך נדחתה.
${reason ? `הסיבה: ${reason}` : ''}
אם אתה חושב שזה שגיאה, אנא צור קשר עם הנהלה.
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`✉️  User denial email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send denial email:', error.message);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️  Email notifications disabled - credentials not configured');
    return false;
  }

  try {
    // Reset transporter to pick up any env changes
    transporter = null;
    await getTransporter().verify();
    console.log('✅ Email service configured and ready');
    console.log(`   Using: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error: any) {
    console.error('❌ Email configuration error:', error.message);
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('   💡 Tip: Check if Gmail is blocking connections or try a different network');
    } else if (error.code === 'EAUTH') {
      console.error('   💡 Tip: Your App Password may be invalid. Generate a new one at:');
      console.error('      https://myaccount.google.com/apppasswords');
    }
    return false;
  }
}

// Send email to admin when new user registers
export async function sendNewUserRegistrationNotification(
  adminEmail: string,
  newUserName: string,
  newUserEmail: string
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log('⚠️  Email notifications disabled - EMAIL_USER not configured');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: adminEmail,
      subject: `🆕 בקשת הרשמה חדשה: ${newUserName}`,
      html: `
        <h2>בקשת הרשמה חדשה</h2>
        <p>משתמש חדש נרשם למערכת וממתין לאישור:</p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196f3;">
          <p><strong>שם:</strong> ${newUserName}</p>
          <p><strong>אימייל:</strong> ${newUserEmail}</p>
          <p><strong>סטטוס:</strong> ממתין לאישור</p>
        </div>

        <p>אנא היכנס למערכת כדי לאשר או לדחות את הבקשה.</p>
        
        <p>בברכה,<br/>מערכת ניהול המשימות</p>
      `,
      text: `
בקשת הרשמה חדשה:
שם: ${newUserName}
אימייל: ${newUserEmail}
אנא היכנס למערכת לאישור.
      `,
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`✉️  New user registration notification sent to ${adminEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send registration notification:', error.message);
    return false;
  }
}

// Send confirmation to new user that registration is pending
export async function sendRegistrationPendingEmail(
  recipientEmail: string,
  userName: string
): Promise<boolean> {
  if (!process.env.EMAIL_USER) {
    console.log('⚠️  Email notifications disabled - EMAIL_USER not configured');
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '⏳ בקשת ההרשמה שלך התקבלה',
      html: `
        <h2>בקשת ההרשמה התקבלה</h2>
        <p>שלום ${userName},</p>
        <p>תודה שנרשמת למערכת ניהול המשימות!</p>
        
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800;">
          <p><strong>הבקשה שלך ממתינה לאישור</strong></p>
          <p>מנהל המערכת יבדוק את הבקשה בהקדם.</p>
          <p>תקבל אימייל נוסף כאשר הבקשה תאושר.</p>
        </div>

        <p>בברכה,<br/>מערכת ניהול המשימות</p>
      `,
      text: `
שלום ${userName},
בקשת ההרשמה שלך התקבלה וממתינה לאישור מנהל.
תקבל אימייל נוסף כאשר הבקשה תאושר.
      `,
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`✉️  Registration pending email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send registration pending email:', error.message);
    return false;
  }
}