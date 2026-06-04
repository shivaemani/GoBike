// GoBike Common Notifications & State Module
// Dynamically handles listed bikes, bookings, and notification panels across all pages.

(function() {
    // 1. Initialize local storage data structures if not present
    if (!localStorage.getItem('listedBikes')) {
        localStorage.setItem('listedBikes', JSON.stringify([]));
    }
    if (!localStorage.getItem('bookings')) {
        localStorage.setItem('bookings', JSON.stringify([]));
    }
    if (!localStorage.getItem('notifications')) {
        // Seed initial welcome notifications
        const initialNotifs = [
            {
                id: 'NT-welcome',
                title: 'Welcome to GoBike!',
                message: 'Start exploring and rent your favorite bikes or list your own to start earning.',
                timestamp: new Date().toISOString(),
                read: false,
                forUser: 'Shiva',
                bikeId: null
            }
        ];
        localStorage.setItem('notifications', JSON.stringify(initialNotifs));
    }

    // 2. Inject Stylesheet for Notification widget
    const notifStyles = `
        .notif-container {
            position: relative;
            display: inline-block;
            margin-right: 15px;
            z-index: 9999;
        }
        .notif-btn {
            background: transparent;
            border: none;
            color: var(--text);
            font-size: 20px;
            cursor: pointer;
            position: relative;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
        }
        .notif-btn:hover {
            background: var(--surface3);
            color: var(--accent);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        }
        .notif-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: var(--amber);
            color: #060b0e;
            font-size: 10px;
            font-weight: 800;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--surface);
        }
        .notif-badge.hidden {
            display: none !important;
        }
        .notif-badge.pulse {
            animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .notif-panel {
            position: absolute;
            top: 50px;
            right: 0;
            width: 320px;
            background: rgba(12, 19, 23, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow), var(--glow);
            padding: 15px;
            max-height: 400px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform-origin: top right;
        }
        .notif-panel.hidden {
            display: none !important;
            opacity: 0;
            transform: scale(0.95);
        }
        .notif-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
        }
        .notif-header h3 {
            margin: 0;
            font-family: var(--ff-head);
            font-size: 15px;
            font-weight: 700;
            color: var(--text);
        }
        .notif-clear-btn {
            background: transparent;
            border: none;
            color: var(--accent2);
            font-size: 11px;
            cursor: pointer;
            font-family: var(--ff-body);
            outline: none;
        }
        .notif-clear-btn:hover {
            text-decoration: underline;
        }
        .notif-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
            max-height: 300px;
            padding-right: 2px;
        }
        .notif-list::-webkit-scrollbar {
            width: 4px;
        }
        .notif-list::-webkit-scrollbar-thumb {
            background: var(--surface3);
            border-radius: 2px;
        }
        .notif-item {
            display: flex;
            gap: 10px;
            padding: 10px;
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .notif-item:hover {
            background: var(--surface3);
            border-color: var(--border-hover);
        }
        .notif-item.unread {
            border-left: 3px solid var(--accent);
            background: rgba(16, 185, 129, 0.03);
        }
        .notif-icon {
            font-size: 16px;
            color: var(--accent);
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
        }
        .notif-content {
            flex: 1;
        }
        .notif-title {
            font-size: 12px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 2px;
        }
        .notif-message {
            font-size: 11px;
            color: var(--muted);
            line-height: 1.4;
        }
        .notif-time {
            font-size: 9px;
            color: var(--muted);
            margin-top: 4px;
            text-align: right;
        }
        .notif-empty {
            text-align: center;
            padding: 20px;
            color: var(--muted);
            font-size: 12px;
        }
        
        /* Adjustments for headers */
        .logo-bar .notif-container {
            margin-left: auto;
            margin-right: 20px;
        }
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.innerHTML = notifStyles;
    document.head.appendChild(styleEl);

    // 3. Inject Widget into Header / Topbar depending on current page
    document.addEventListener('DOMContentLoaded', () => {
        injectNotificationWidget();
        // Close notification panel when clicking outside
        document.addEventListener('click', (e) => {
            const container = document.querySelector('.notif-container');
            const panel = document.getElementById('notifPanel');
            if (container && panel && !container.contains(e.target)) {
                panel.classList.add('hidden');
            }
        });
    });

    function injectNotificationWidget() {
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1);

        // Find insertion point
        let parentEl = null;
        let referenceEl = null;

        if (pageName === 'dashboard.html' || pageName === 'myrides.html' || pageName === 'bike-details.html') {
            // Dashboard / Rides / Details style header
            const navTop = document.querySelector('.nav-top');
            const profile = document.querySelector('.profile');
            if (navTop && profile) {
                parentEl = navTop;
                referenceEl = profile;
            }
        } else if (pageName === 'findbike.html') {
            // Find Bike style logo-bar
            const logoBar = document.querySelector('.logo-bar');
            if (logoBar) {
                parentEl = logoBar;
                referenceEl = null; // append to end (margin-left auto pushes it right)
            }
        } else if (pageName === 'listbike.html') {
            // List Bike style nav
            const nav = document.querySelector('nav');
            const backLink = document.querySelector('.back-link');
            if (nav && backLink) {
                parentEl = nav;
                referenceEl = backLink;
            }
        }

        if (!parentEl) return; // Not an interactive page or elements missing

        // Build HTML
        const container = document.createElement('div');
        container.className = 'notif-container';
        container.innerHTML = `
            <button class="notif-btn" id="notifBtn" title="Notifications">
                <i class="fa-regular fa-bell"></i>
                <span class="notif-badge hidden" id="notifBadge">0</span>
            </button>
            <div class="notif-panel hidden" id="notifPanel">
                <div class="notif-header">
                    <h3>Notifications</h3>
                    <button class="notif-clear-btn" id="notifClearBtn">Mark all as read</button>
                </div>
                <div class="notif-list" id="notifList"></div>
            </div>
        `;

        if (referenceEl) {
            parentEl.insertBefore(container, referenceEl);
        } else {
            parentEl.appendChild(container);
        }

        // Bind events
        const notifBtn = document.getElementById('notifBtn');
        const notifPanel = document.getElementById('notifPanel');
        const notifClearBtn = document.getElementById('notifClearBtn');

        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                // Mark displayed notifications as read when opening panel
                markNotificationsAsRead();
            }
        });

        notifClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllNotificationsAsRead();
        });

        // Initial render
        renderNotifications();
    }

    // Render Notifications in the dropdown list
    window.renderNotifications = function() {
        const notifList = document.getElementById('notifList');
        const notifBadge = document.getElementById('notifBadge');
        if (!notifList) return;

        const currentUser = localStorage.getItem('currentUser') || 'Shiva';
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const listedBikes = JSON.parse(localStorage.getItem('listedBikes') || '[]');
        
        // Find IDs of bikes owned by current user
        const ownedBikeIds = listedBikes
            .filter(b => b.ownerName === currentUser)
            .map(b => b.id);

        // Filter notifications: 
        // 1. Sent directly to currentUser
        // 2. Or related to a bike owned by currentUser
        const userNotifs = notifications.filter(n => {
            return n.forUser === currentUser || (n.bikeId && ownedBikeIds.includes(n.bikeId));
        });

        // Sort by timestamp desc
        userNotifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Count unread
        const unreadCount = userNotifs.filter(n => !n.read).length;
        if (unreadCount > 0) {
            notifBadge.textContent = unreadCount;
            notifBadge.classList.remove('hidden');
            notifBadge.classList.add('pulse');
        } else {
            notifBadge.classList.add('hidden');
            notifBadge.classList.remove('pulse');
        }

        if (userNotifs.length === 0) {
            notifList.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
            return;
        }

        notifList.innerHTML = userNotifs.map(n => {
            let iconClass = 'fa-bell';
            if (n.title.toLowerCase().includes('booking') || n.title.toLowerCase().includes('booked')) {
                iconClass = 'fa-calendar-check';
            } else if (n.title.toLowerCase().includes('listed') || n.title.toLowerCase().includes('success')) {
                iconClass = 'fa-circle-check';
            }

            const formattedTime = formatTimeAgo(n.timestamp);

            return `
                <div class="notif-item ${n.read ? '' : 'unread'}">
                    <div class="notif-icon"><i class="fa-solid ${iconClass}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-message">${n.message}</div>
                        <div class="notif-time">${formattedTime}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    function markNotificationsAsRead() {
        const currentUser = localStorage.getItem('currentUser') || 'Shiva';
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const listedBikes = JSON.parse(localStorage.getItem('listedBikes') || '[]');
        
        const ownedBikeIds = listedBikes
            .filter(b => b.ownerName === currentUser)
            .map(b => b.id);

        const updatedNotifs = notifications.map(n => {
            if (n.forUser === currentUser || (n.bikeId && ownedBikeIds.includes(n.bikeId))) {
                n.read = true;
            }
            return n;
        });

        localStorage.setItem('notifications', JSON.stringify(updatedNotifs));
        
        // Update badge after a short delay so the user sees it disappear naturally
        setTimeout(() => {
            const badge = document.getElementById('notifBadge');
            if (badge) {
                badge.classList.add('hidden');
                badge.classList.remove('pulse');
            }
        }, 1500);
    }

    function markAllNotificationsAsRead() {
        markNotificationsAsRead();
        renderNotifications();
    }

    // Helper function to format time ago
    function formatTimeAgo(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    // 4. Exposed globally helper to add notifications
    window.addNotification = function(title, message, forUser, bikeId = null) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const newNotif = {
            id: 'NT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            forUser: forUser,
            bikeId: bikeId
        };
        notifications.push(newNotif);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        // Re-render if widget exists on the current page
        renderNotifications();
    };

})();
