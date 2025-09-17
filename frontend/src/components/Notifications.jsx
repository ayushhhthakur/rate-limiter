import React from 'react';

const Notifications = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-md shadow-lg max-w-sm ${
            notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm">{notification.message}</p>
            <button
              onClick={() => onDismiss(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notifications;
