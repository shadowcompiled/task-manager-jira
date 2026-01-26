import db from './database';
import bcrypt from 'bcryptjs';

export function seedDatabase() {
  // Create restaurant
  const restaurant = db.prepare(`
    INSERT INTO restaurants (name, location) VALUES (?, ?)
  `).run('מסעדת הבית', 'רחוב הראשי 123');

  // Create default statuses
  const defaultStatuses = [
    { name: 'planned', displayName: 'מתוכנן', color: '#64748b', order: 0 },
    { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6', order: 1 },
    { name: 'in_progress', displayName: 'בביצוע', color: '#8b5cf6', order: 2 },
    { name: 'waiting', displayName: 'ממתין', color: '#f59e0b', order: 3 },
    { name: 'completed', displayName: 'הושלם', color: '#10b981', order: 4 },
    { name: 'verified', displayName: 'אומת', color: '#059669', order: 5 }
  ];

  defaultStatuses.forEach((status) => {
    db.prepare(`
      INSERT INTO statuses (restaurant_id, name, display_name, color, order_index, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(restaurant.lastInsertRowid, status.name, status.displayName, status.color, status.order);
  });

  // Create ONLY admin user - no workers, no tasks
  db.prepare(`
    INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'admin@restaurant.com',
    'מנהל ראשי',
    bcrypt.hashSync('admin123', 10),
    'admin',
    'approved',
    restaurant.lastInsertRowid
  );

  console.log('');
  console.log('✅ מסד נתונים אותחל בהצלחה');
  console.log('');
  console.log('פרטי התחברות מנהל:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('אימייל: admin@restaurant.com');
  console.log('סיסמה: admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('הוסף עובדים ומשימות דרך הממשק!');
}
