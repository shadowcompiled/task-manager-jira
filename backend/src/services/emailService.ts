import nodemailer from 'nodemailer';

// Configure your email service here
// For development, use a service like Mailtrap or Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

export interface EmailNotification {
  recipientEmail: string;
  taskTitle: string;
  taskId: number;
  dueDate: string;
  assignedTo: string;
  organizationName: string;
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: notification.recipientEmail,
      subject: `⏰ משימה עומדת לפוג: ${notification.taskTitle}`,
      html: `
        <h2>הודעה לגבי משימה</h2>
        <p>שלום ${notification.assignedTo},</p>
        <p>זה הודעה להזכיר לך כי המשימה הבאה עומדת לפוג משהו בעיתוי הקרוב:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>שם המשימה:</strong> ${notification.taskTitle}</p>
          <p><strong>תאריך סיום:</strong> ${dueDate.toLocaleDateString('he-IL')}</p>
          <p><strong>ימים נותרים:</strong> <span style="color: #d32f2f; font-weight: bold;">${daysRemaining}</span></p>
          <p><strong>ארגון:</strong> ${notification.organizationName}</p>
        </div>

        <p>אנא עדכן את סטטוס המשימה כדי שנוכל לעקוב אחר ההתקדמות.</p>
        
        <p>בברכה,<br/>מערכת ניהול המשימות</p>
      `,
      text: `
משימה ${notification.taskTitle} עומדת לפוג בתאריך ${dueDate.toLocaleDateString('he-IL')}.
אנא עדכן את סטטוס המשימה.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✉️  Expiration notification sent to ${notification.recipientEmail}`
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
  orgName: string
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
          <p><strong>ארגון:</strong> ${orgName}</p>
        </div>

        <p>אנא בדוק את פרטי המשימה ותחל בביצוע שלה.</p>
        
        <p>בברכה,<br/>מערכת ניהול המשימות</p>
      `,
      text: `
משימה חדשה נוספה לך: ${taskTitle}
הוקצתה על ידי: ${assignedByName}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
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

    const info = await transporter.sendMail(mailOptions);
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

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️  User denial email sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send denial email:', error.message);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('✅ Email service configured and ready');
    return true;
  } catch (error: any) {
    console.error('Email configuration error:', error.message);
    return false;
  }}