"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface UnsavedChangesContextType {
    isDirty: boolean;
    setIsDirty: (dirty: boolean) => void;
    registerSaveHandler: (handler: () => Promise<void | boolean>) => void;
    handleNavigation: (href: string) => void;
    handleAction: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);
    const [saveHandler, setSaveHandler] = useState<(() => Promise<void | boolean>) | null>(null);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    // Reset dirty state on route change (success)
    useEffect(() => {
        setIsDirty(false);
        setSaveHandler(null);
        setPendingNavigation(null);
        setPendingAction(null);
        setShowModal(false);
    }, [pathname]);

    const registerSaveHandler = useCallback((handler: () => Promise<void | boolean>) => {
        setSaveHandler(() => handler);
    }, []);

    const handleNavigation = useCallback((href: string) => {
        if (isDirty) {
            setPendingNavigation(href);
            setPendingAction(null);
            setShowModal(true);
        } else {
            router.push(href);
        }
    }, [isDirty, router]);

    const handleAction = useCallback((action: () => void) => {
        if (isDirty) {
            setPendingAction(() => action);
            setPendingNavigation(null);
            setShowModal(true);
        } else {
            action();
        }
    }, [isDirty]);

    const handleConfirm = async () => {
        if (saveHandler) {
            setIsSaving(true);
            try {
                // Determine if save was successful (if handler returns boolean)
                // If void, assume success unless error thrown
                const result = await saveHandler();

                // If result is explicitly false, don't proceed (save failed)
                if (result === false) {
                    // Stay on page, keep dirty
                    setIsSaving(false);
                    setShowModal(false); // Close modal to let user fix errors
                    return;
                }

                // Save success: proceed to navigation
                setIsDirty(false);
                setShowModal(false);
                if (pendingNavigation) {
                    router.push(pendingNavigation);
                } else if (pendingAction) {
                    pendingAction();
                }
            } catch (error) {
                console.error("Failed to save during navigation:", error);
                // Stay on page
            } finally {
                setIsSaving(false);
            }
        } else {
            // No save handler? Just proceed? Warning says "update will be lost", so proceeding implies losing changes.
            // But this "Confirm" button is "Save & Proceed". So if no save handler, maybe we shouldn't show "Save"?
            // Assuming registerSaveHandler is always called by forms.
            setIsDirty(false);
            setShowModal(false);
            if (pendingNavigation) {
                router.push(pendingNavigation);
            } else if (pendingAction) {
                pendingAction();
            }
        }
    };

    const handleDiscard = () => {
        setIsDirty(false);
        setShowModal(false);
        if (pendingNavigation) {
            router.push(pendingNavigation);
        } else if (pendingAction) {
            pendingAction();
        }
    };

    const handleCancel = () => {
        setPendingNavigation(null);
        setPendingAction(null);
        setShowModal(false);
    };

    return (
        <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty, registerSaveHandler, handleNavigation, handleAction }}>
            {children}
            {showModal && (
                <ConfirmationModal
                    isOpen={showModal}
                    title="Unsaved Changes"
                    message="You have unsaved changes. Do you want to save them before leaving?"
                    confirmLabel="Save & Continue"
                    cancelLabel="Stay on Page"
                    onConfirm={handleConfirm}
                    onClose={handleCancel}
                    isLoading={isSaving}

                    customActions={
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDiscard}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-hover text-content-primary hover:bg-surface-hover transition-colors shadow-lg shadow-black/20"
                                >
                                    Discard & Proceed
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 flex items-center justify-center min-w-[140px]"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        "Save & Continue"
                                    )}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="text-sm font-medium text-content-muted hover:text-white transition-colors px-2 py-1"
                            >
                                Stay on Page
                            </button>
                        </div>
                    }
                />
            )}
        </UnsavedChangesContext.Provider>
    );
}

export function useUnsavedChanges() {
    const context = useContext(UnsavedChangesContext);
    if (!context) {
        throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider");
    }
    return context;
}

export function useUnsavedChangesSafe() {
    return useContext(UnsavedChangesContext);
}
