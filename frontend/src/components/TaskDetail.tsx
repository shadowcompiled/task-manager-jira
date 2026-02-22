import { useState, useEffect } from 'react';
import { useTaskStore, useAuthStore } from '../store';
import axios from 'axios';

export default function TaskDetail({ taskId, onClose, onTaskUpdate }: any) {
  const { currentTask, fetchTask, completeTask, verifyTask, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskId) {
      setError('');
      fetchTask(taskId).catch(() => setError('Failed to load task'));
      fetchTeamMembers();
    }
  }, [taskId]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${(import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'))}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-red-500 text-white rounded-lg p-6 max-w-md">
          <p className="font-bold mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-red-700 hover:bg-red-800 px-4 py-2 rounded text-white font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">Loading task...</div>
      </div>
    );
  }

  const handleComplete = async () => {
    try {
      await completeTask(currentTask.id);
      onTaskUpdate?.();
    } catch (err) {
      console.error('Failed to complete task');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyTask(currentTask.id, comment);
      setComment('');
      onTaskUpdate?.();
    } catch (err) {
      console.error('Failed to verify task');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateTask(currentTask.id, editData);
      setIsEditing(false);
      setEditData(null);
      onTaskUpdate?.();
    } catch (err) {
      console.error('Failed to update task');
    }
  };

  const priorityColors = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-orange-600 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  const statusColors = {
    planned: 'text-gray-600 bg-gray-50',
    assigned: 'text-blue-600 bg-blue-50',
    in_progress: 'text-purple-600 bg-purple-50',
    waiting: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    verified: 'text-emerald-600 bg-emerald-50',
    overdue: 'text-red-600 bg-red-50',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
        <div className="p-6 border-b flex justify-between items-start">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="text-2xl font-bold w-full border rounded px-2 py-1"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-800">{currentTask.title}</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl ml-4"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">סטטוס</label>
              {isEditing ? (
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {['planned', 'assigned', 'in_progress', 'waiting', 'completed', 'verified'].map((s) => {
                    const labels: Record<string, string> = {
                      planned: 'מתוכנן',
                      assigned: 'הוקצה',
                      in_progress: 'בתהליך',
                      waiting: 'בהמתנה',
                      completed: 'הושלם',
                      verified: 'אומת'
                    };
                    return <option key={s} value={s}>{labels[s]}</option>;
                  })}
                </select>
              ) : (
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${statusColors[currentTask.status as keyof typeof statusColors]}`}>
                  {currentTask.status === 'planned' ? 'מתוכנן' : currentTask.status === 'assigned' ? 'הוקצה' : currentTask.status === 'in_progress' ? 'בתהליך' : currentTask.status === 'waiting' ? 'בהמתנה' : currentTask.status === 'completed' ? 'הושלם' : currentTask.status === 'verified' ? 'אומת' : currentTask.status}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">עדיפות</label>
              {isEditing ? (
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {['low', 'medium', 'high', 'critical'].map((p) => {
                    const labels: Record<string, string> = {
                      low: 'נמוך',
                      medium: 'בינוני',
                      high: 'גבוה',
                      critical: 'דחוף ביותר'
                    };
                    return <option key={p} value={p}>{labels[p]}</option>;
                  })}
                </select>
              ) : (
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold ${priorityColors[currentTask.priority as keyof typeof priorityColors]}`}>
                  {currentTask.priority === 'critical' ? 'דחוף ביותר' : currentTask.priority === 'high' ? 'גבוה' : currentTask.priority === 'medium' ? 'בינוני' : 'נמוך'}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
            {isEditing ? (
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-24"
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{currentTask.description || 'אין תיאור'}</p>
            )}
          </div>

          {/* Assignment & Due Date */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-semibold text-gray-700 block mb-2">הוקצה ל:</label>
              {isEditing ? (
                <select
                  value={editData.assigned_to || ''}
                  onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">לא הוקצה</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-600">{currentTask.assigned_to_name || 'לא הוקצה'}</p>
              )}
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-2">תאריך יעד:</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.due_date ? editData.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-600">
                  {currentTask.due_date ? new Date(currentTask.due_date).toLocaleDateString('he-IL') : 'אין תאריך יעד'}
                </p>
              )}
            </div>
          </div>

          {/* Checklists */}
          {currentTask.checklists && currentTask.checklists.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">רשימת בדיקה</label>
              <div className="space-y-2">
                {currentTask.checklists.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="w-5 h-5"
                    />
                    <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-700'}>
                      {item.item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {currentTask.comments && currentTask.comments.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">הערות</label>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {currentTask.comments.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-semibold text-sm text-gray-800">{c.user_name}</p>
                    <p className="text-gray-700 text-sm mt-1">{c.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString('he-IL')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add comment for verification */}
          {user?.role === 'manager' && currentTask.status === 'completed' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">הערת אימות</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="הוסף משוב לפני אימות..."
                className="w-full px-3 py-2 border rounded-lg h-20"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t flex gap-3 justify-end flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                שמירת שינויים
              </button>
            </>
          ) : (
            <>
              {(user?.role !== 'staff' || user?.id === currentTask.assigned_to) && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditData({
                      title: currentTask.title,
                      description: currentTask.description,
                      status: currentTask.status,
                      priority: currentTask.priority,
                      assigned_to: currentTask.assigned_to,
                      due_date: currentTask.due_date
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  עריכה
                </button>
              )}
              {user?.id === currentTask.assigned_to && currentTask.status === 'assigned' && (
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  סימון כמושלם
                </button>
              )}
              {user?.role === 'manager' && currentTask.status === 'completed' && (
                <button
                  onClick={handleVerify}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  ✓ אימות
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
