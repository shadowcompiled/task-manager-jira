import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

interface StaffPerformance {
  user_id: number;
  user_name: string;
  total_assigned: number;
  completed: number;
  completion_rate: number;
}

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'maintainer') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, staffRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/stats/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/dashboard/stats/staff-performance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setStats(statsRes.data);
        setStaffPerformance(staffRes.data);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  if (user?.role !== 'admin' && user?.role !== 'maintainer') {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">אין גישה לעמוד זה</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-teal-400">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">סטטיסטיקה</h1>
        <p className="text-sm text-slate-400">סקירה כללית של המשימות</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.total_tasks}</p>
            <p className="text-sm text-slate-400">סה"כ משימות</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-teal-400">{stats.completed_tasks}</p>
            <p className="text-sm text-slate-400">הושלמו</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-slate-300">{stats.pending_tasks}</p>
            <p className="text-sm text-slate-400">ממתינות</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-orange-400">{stats.overdue_tasks}</p>
            <p className="text-sm text-slate-400">באיחור</p>
          </div>
        </div>
      )}

      {/* Completion Rate */}
      {stats && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">אחוז השלמה</p>
            <p className="text-lg font-bold text-teal-400">{stats.completion_rate}%</p>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${stats.completion_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Staff Performance */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3">ביצועי עובדים</h2>
        {staffPerformance.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-slate-400">אין נתונים להצגה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffPerformance.map((staff) => (
              <div key={staff.user_id} className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    <span className="font-bold text-white">{staff.user_name}</span>
                  </div>
                  <span className="text-teal-400 font-bold">{staff.completion_rate}%</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>הושלמו: {staff.completed}</span>
                  <span>מתוך: {staff.total_assigned}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${staff.completion_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
