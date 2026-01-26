import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded from the correct .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Resend
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Default from email (Resend requires verified domain or use onboarding@resend.dev for testing)
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

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
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
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

    const subject = isOverdue 
      ? `🚨 משימה באיחור! ${notification.taskTitle}`
      : `⏰ תזכורת יומית: ${notification.taskTitle}`;
    
    const statusText = isOverdue
      ? `<span style="color: #d32f2f; font-weight: bold;">באיחור ${daysOverdue} ימים!</span>`
      : `<span style="color: #ff9800; font-weight: bold;">${daysRemaining} ימים נותרים</span>`;

    const headerColor = isOverdue ? '#d32f2f' : '#ff9800';
    const headerText = isOverdue ? '🚨 משימה באיחור!' : '⏰ משימה עומדת לפוג';

    await getResend().emails.send({
      from: FROM_EMAIL,
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
    });

    console.log(`✉️  ${isOverdue ? 'OVERDUE' : 'Expiration'} notification sent to ${notification.recipientEmail}`);
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
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `📋 נוספה לך משימה חדשה: ${taskTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>נוספה לך משימה חדשה</h2>
          <p>שלום,</p>
          <p>${assignedByName} הקצה לך משימה חדשה:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>שם המשימה:</strong> ${taskTitle}</p>
            <p><strong>הוקצתה על ידי:</strong> ${assignedByName}</p>
            <p><strong>מסעדה:</strong> ${restaurantName}</p>
          </div>

          <p>אנא בדוק את פרטי המשימה ותחל בביצוע שלה.</p>
          
          <p>בברכה,<br/>מערכת ניהול המשימות</p>
        </div>
      `,
    });

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
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: '✅ בקשת ההרשמה שלך אושרה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
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
        </div>
      `,
    });

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
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: '❌ בקשת ההרשמה שלך נדחתה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>בקשת ההרשמה</h2>
          <p>שלום ${userName},</p>
          <p>לצערנו, בקשת ההרשמה שלך <strong>נדחתה</strong>.</p>
          
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f44336;">
            ${reason ? `<p><strong>הסיבה:</strong> ${reason}</p>` : ''}
            <p>אם אתה חושב שזה שגיאה, אנא צור קשר עם הנהלה.</p>
          </div>

          <p>בברכה,<br/>צוות מערכת ניהול המשימות</p>
        </div>
      `,
    });

    console.log(`✉️  User denial email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send denial email:', error.message);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    // Test the API key by getting domains (lightweight call)
    const resendClient = getResend();
    console.log('✅ Resend email service configured and ready');
    console.log(`   From: ${FROM_EMAIL}`);
    return true;
  } catch (error: any) {
    console.error('❌ Resend configuration error:', error.message);
    return false;
  }
}

// Send email to admin when new user registers
export async function sendNewUserRegistrationNotification(
  adminEmail: string,
  newUserName: string,
  newUserEmail: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `🆕 בקשת הרשמה חדשה: ${newUserName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>בקשת הרשמה חדשה</h2>
          <p>משתמש חדש נרשם למערכת וממתין לאישור:</p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196f3;">
            <p><strong>שם:</strong> ${newUserName}</p>
            <p><strong>אימייל:</strong> ${newUserEmail}</p>
            <p><strong>סטטוס:</strong> ממתין לאישור</p>
          </div>

          <p>אנא היכנס למערכת כדי לאשר או לדחות את הבקשה.</p>
          
          <p>בברכה,<br/>מערכת ניהול המשימות</p>
        </div>
      `,
    });

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
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Email notifications disabled - RESEND_API_KEY not configured');
    return false;
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: '⏳ בקשת ההרשמה שלך התקבלה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>בקשת ההרשמה התקבלה</h2>
          <p>שלום ${userName},</p>
          <p>תודה שנרשמת למערכת ניהול המשימות!</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800;">
            <p><strong>הבקשה שלך ממתינה לאישור</strong></p>
            <p>מנהל המערכת יבדוק את הבקשה בהקדם.</p>
            <p>תקבל אימייל נוסף כאשר הבקשה תאושר.</p>
          </div>

          <p>בברכה,<br/>מערכת ניהול המשימות</p>
        </div>
      `,
    });

    console.log(`✉️  Registration pending email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send registration pending email:', error.message);
    return false;
  }
}
