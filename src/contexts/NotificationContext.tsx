"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastContainer } from "@/components/ui/Toast";

interface Notification {
    id: string;
    title: string;
    subtitle?: string;
    duration?: number;
}

interface NotificationContextType {
    showNotification: (title: string, subtitle?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((title: string, subtitle?: string, duration: number = 3000) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        setNotifications((prev) => [...prev, { id, title, subtitle, duration }]);
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <ToastContainer
                toasts={notifications.map((n) => ({ ...n, onDismiss: dismissNotification }))}
                onDismiss={dismissNotification}
            />
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}
