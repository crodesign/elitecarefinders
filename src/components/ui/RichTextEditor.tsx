"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    $getSelection,
    $isRangeSelection,
    $insertNodes,
    $getRoot,
    EditorState,
    LexicalEditor,
} from "lexical";
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
    $isListNode,
    ListNode,
    ListItemNode,
} from "@lexical/list";
import {
    HeadingNode,
    QuoteNode,
    $createHeadingNode,
    $isHeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
    Bold, Italic, Underline, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Heading2, Heading3, Heading4, Type, ChevronDown,
    Link as LinkIcon, Unlink, ExternalLink, X, Check,
} from "lucide-react";
import { $createParagraphNode } from "lexical";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const theme = {
    text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "font-mono bg-surface-secondary px-1 rounded text-sm text-content-primary",
    },
    heading: {
        h2: "text-xl font-bold mt-3 mb-1",
        h3: "text-lg font-semibold mt-2 mb-1",
        h4: "text-base font-semibold mt-2 mb-0.5",
    },
    list: {
        nested: { listitem: "list-none" },
        ol: "list-decimal pl-5 my-1",
        ul: "list-disc pl-5 my-1",
        listitem: "my-0.5",
    },
    link: "text-accent hover:underline cursor-pointer",
    paragraph: "my-0.5",
};

// ─── Toolbar ─────────────────────────────────────────────────────────────────

// ─── Link Modal ──────────────────────────────────────────────────────────────

function LinkModal({
    initialUrl,
    onSave,
    onRemove,
    onClose,
}: {
    initialUrl: string;
    onSave: (url: string, newTab: boolean) => void;
    onRemove: () => void;
    onClose: () => void;
}) {
    const [url, setUrl] = useState(initialUrl);
    const [newTab, setNewTab] = useState(true);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isValidUrl = (v: string) =>
        v.trim() === "" ||
        /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(\/.*)?$/.test(v.trim());

    const valid = isValidUrl(url);
    const hasContent = url.trim().length > 0;
    const showError = hasSubmitted && hasContent && !valid;

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSave = () => {
        setHasSubmitted(true);
        if (!valid) return;
        if (hasContent) onSave(url.trim(), newTab);
        else onRemove();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-surface-secondary/60 backdrop-blur-sm" onClick={onClose} />
            {/* Modal */}
            <div className="relative bg-surface-primary border border-ui-border rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-accent" />
                        Insert Link
                    </h3>
                    <button type="button" onClick={onClose}
                        className="p-1 rounded hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* URL Input */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-content-muted font-medium">URL</label>
                    <input
                        ref={inputRef}
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className={`w-full bg-surface-input rounded-lg px-3 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none transition-colors font-mono border-2 ${showError
                            ? "border-red-500"
                            : "border-transparent"
                            }`}
                        onKeyDown={e => {
                            if (e.key === "Enter") handleSave();
                            if (e.key === "Escape") onClose();
                        }}
                    />
                    {showError && (
                        <p className="text-[11px] text-red-400">
                            Must be a full URL — e.g. <span className="font-mono">https://example.com</span>
                        </p>
                    )}
                </div>

                {/* New Tab Toggle */}
                <div className="flex items-center justify-between gap-2 py-2 pr-3 pl-3.5 bg-surface-input rounded-lg">
                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap">
                        Open in new tab
                    </label>
                    <button
                        type="button"
                        onClick={() => setNewTab(v => !v)}
                        className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0 focus:outline-none bg-surface-hover"
                        style={{ backgroundColor: newTab ? "var(--color-accent, #3b82f6)" : undefined }}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${newTab ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-between">
                    <button
                        type="button"
                        onClick={() => { onRemove(); onClose(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    >
                        <Unlink className="w-3.5 h-3.5" />
                        Remove link
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 text-xs text-content-muted hover:text-content-primary rounded-lg hover:bg-surface-hover transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={handleSave}
                            disabled={!hasContent}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <Check className="w-3.5 h-3.5" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar() {
    const [editor] = useLexicalComposerContext();
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isBullet, setIsBullet] = useState(false);
    const [isOrdered, setIsOrdered] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [currentLinkUrl, setCurrentLinkUrl] = useState("");
    const [blockType, setBlockType] = useState<string>("paragraph");
    const [showHeadingMenu, setShowHeadingMenu] = useState(false);
    const [showAlignMenu, setShowAlignMenu] = useState(false);

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));

            const anchorNode = selection.anchor.getNode();
            const element = anchorNode.getKey() === "root"
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();

            if ($isHeadingNode(element)) {
                setBlockType(element.getTag());
            } else if ($isListNode(element)) {
                const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                const type = parentList ? parentList.getListType() : element.getListType();
                setBlockType(type === "bullet" ? "bullet" : "number");
                setIsBullet(type === "bullet");
                setIsOrdered(type === "number");
            } else {
                setBlockType("paragraph");
                setIsBullet(false);
                setIsOrdered(false);
            }

            // Check link
            const node = selection.anchor.getNode();
            const parent = node.getParent();
            setIsLink(parent?.getType() === "link" || node.getType() === "link");
        }
    }, []);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => updateToolbar());
            })
        );
    }, [editor, updateToolbar]);

    const formatHeading = (tag: "h2" | "h3" | "h4" | "paragraph") => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                if (tag === "paragraph") {
                    $setBlocksType(selection, () => $createParagraphNode());
                } else {
                    $setBlocksType(selection, () => $createHeadingNode(tag));
                }
            }
        });
        setShowHeadingMenu(false);
    };

    const headingIcon = () => {
        if (blockType === "h2") return <Heading2 className="w-4 h-4" />;
        if (blockType === "h3") return <Heading3 className="w-4 h-4" />;
        if (blockType === "h4") return <Heading4 className="w-4 h-4" />;
        return <Type className="w-4 h-4" />;
    };

    const btn = (active: boolean) =>
        `p-2 rounded transition-colors ${active ? "bg-accent text-white" : "text-content-muted hover:text-content-primary hover:bg-surface-hover"}`;

    const dropdownBtn = "flex items-center gap-2 w-full px-3 py-2 text-xs rounded hover:bg-surface-hover text-left";

    return (
        <div className="flex items-center gap-1 p-2 bg-transparent flex-wrap">
            {/* Bold / Italic / Underline */}
            <button type="button" className={btn(isBold)} title="Bold"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
                <Bold className="w-4 h-4" />
            </button>
            <button type="button" className={btn(isItalic)} title="Italic"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
                <Italic className="w-4 h-4" />
            </button>
            <button type="button" className={btn(isUnderline)} title="Underline"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
                <Underline className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-ui-border mx-1 flex-shrink-0" />

            {/* Heading picker */}
            <div className="relative">
                <button type="button"
                    className="p-2 rounded hover:bg-white/10 text-content-muted hover:text-white flex items-center gap-1 transition-colors"
                    onClick={() => { setShowHeadingMenu(v => !v); setShowAlignMenu(false); }}>
                    {headingIcon()}
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showHeadingMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-ui-border rounded-lg shadow-xl z-50 flex flex-col p-1 min-w-[130px]">
                        {([["paragraph", <Type key="para" className="w-4 h-4" />, "Normal"],
                        ["h2", <Heading2 key="h2" className="w-4 h-4" />, "Heading 2"],
                        ["h3", <Heading3 key="h3" className="w-4 h-4" />, "Heading 3"],
                        ["h4", <Heading4 key="h4" className="w-4 h-4" />, "Heading 4"]] as const).map(([tag, icon, label]) => (
                            <button key={tag} type="button"
                                className={`${dropdownBtn} ${blockType === tag ? "text-accent" : "text-content-muted"}`}
                                onClick={() => formatHeading(tag as any)}>
                                {icon}<span>{label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-ui-border mx-1 flex-shrink-0" />

            {/* Lists */}
            <button type="button" className={btn(isBullet)} title="Bullet list"
                onClick={() => editor.dispatchCommand(
                    isBullet ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined)}>
                <List className="w-4 h-4" />
            </button>
            <button type="button" className={btn(isOrdered)} title="Ordered list"
                onClick={() => editor.dispatchCommand(
                    isOrdered ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)}>
                <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-ui-border mx-1 flex-shrink-0" />

            {/* Alignment */}
            <div className="relative">
                <button type="button"
                    className="p-2 rounded hover:bg-white/10 text-content-muted hover:text-white flex items-center gap-1 transition-colors"
                    onClick={() => { setShowAlignMenu(v => !v); setShowHeadingMenu(false); }}>
                    <AlignLeft className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showAlignMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-ui-border rounded-lg shadow-xl z-50 flex flex-col p-1 min-w-[120px]">
                        {([["left", <AlignLeft key="left" className="w-4 h-4" />, "Left"],
                        ["center", <AlignCenter key="center" className="w-4 h-4" />, "Center"],
                        ["right", <AlignRight key="right" className="w-4 h-4" />, "Right"],
                        ["justify", <AlignJustify key="justify" className="w-4 h-4" />, "Justify"]] as const).map(([align, icon, label]) => (
                            <button key={align} type="button"
                                className={`${dropdownBtn} text-content-muted`}
                                onClick={() => {
                                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align as any);
                                    setShowAlignMenu(false);
                                }}>
                                {icon}<span>{label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-ui-border mx-1 flex-shrink-0" />

            {/* Link */}
            <button type="button" className={btn(isLink)} title="Link"
                onClick={() => {
                    editor.getEditorState().read(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const node = selection.anchor.getNode();
                            const parent = node.getParent();
                            const linkNode = parent?.getType() === "link" ? parent : null;
                            setCurrentLinkUrl((linkNode as any)?.getURL?.() ?? "");
                        }
                    });
                    setShowLinkModal(true);
                }}>
                {isLink ? <Unlink className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
            </button>

            {/* Link Modal */}
            {showLinkModal && (
                <LinkModal
                    initialUrl={currentLinkUrl}
                    onSave={(url, newTab) =>
                        editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
                            url,
                            target: newTab ? "_blank" : undefined,
                        })
                    }
                    onRemove={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)}
                    onClose={() => setShowLinkModal(false)}
                />
            )}
        </div>
    );
}

// ─── HTML Sync Plugin ─────────────────────────────────────────────────────────

function HtmlPlugin({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [editor] = useLexicalComposerContext();
    const [initialized, setInitialized] = useState(false);
    const suppressNextRef = useRef(false);

    // Load initial HTML value
    useEffect(() => {
        if (!initialized && value) {
            suppressNextRef.current = true;
            editor.update(() => {
                const root = $getRoot();
                if (root.getFirstChild() === null || root.getTextContent() === "") {
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(value, "text/html");
                    const nodes = $generateNodesFromDOM(editor, dom);
                    root.clear();
                    $insertNodes(nodes);
                }
            }, {
                onUpdate: () => {
                    editor.getRootElement()?.blur();
                },
            });
            setInitialized(true);
        }
    }, [editor, value, initialized]);

    return (
        <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState: EditorState, editor: LexicalEditor) => {
                if (suppressNextRef.current) {
                    suppressNextRef.current = false;
                    return;
                }
                editorState.read(() => {
                    const html = $generateHtmlFromNodes(editor, null);
                    onChange(html);
                });
            }}
        />
    );
}

// ─── Placeholder Plugin ───────────────────────────────────────────────────────

function PlaceholderComponent({ text }: { text: string }) {
    return (
        <div className="absolute top-0 left-0 p-4 text-sm text-content-muted pointer-events-none select-none">
            {text}
        </div>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Write something...",
    minHeight = "min-h-[200px]",
    className = "",
}: RichTextEditorProps) {
    const initialConfig = {
        namespace: "RichTextEditor",
        theme,
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
        onError: (error: Error) => console.error("Lexical error:", error),
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={`w-full bg-surface-input border border-ui-border rounded-lg overflow-hidden flex flex-col transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent ${className}`}>
                <Toolbar />
                <div className="relative flex-1 flex flex-col">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={`editor-bg max-w-none focus:outline-none text-sm text-content-primary ${minHeight} flex-1 p-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-content-primary [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-content-primary [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-content-primary [&_p]:text-content-secondary [&_a]:text-accent hover:[&_a]:underline`}
                            />
                        }
                        placeholder={<PlaceholderComponent text={placeholder} />}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />
                <LinkPlugin />
                <HtmlPlugin value={value} onChange={onChange} />
            </div>
        </LexicalComposer>
    );
}
