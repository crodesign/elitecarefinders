import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import LinkExtension from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Heading4, AlignLeft, AlignCenter, AlignRight, AlignJustify, ChevronDown, Type, Link as LinkIcon, Check, X, Unlink, ExternalLink } from "lucide-react";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Write something...",
    minHeight = "min-h-[200px]"
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            LinkExtension.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: "https",
                HTMLAttributes: {
                    class: 'text-accent hover:underline',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: `prose prose-invert max-w-none focus:outline-none text-sm text-white ${minHeight} p-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:text-base [&_h4]:font-semibold`,
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false,
    });

    // Update editor content when value prop changes (e.g. form reset or switch record)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const [showAlignDropdown, setShowAlignDropdown] = useState(false);
    const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [isExternal, setIsExternal] = useState(false);

    if (!editor) {
        return null;
    }

    const getCurrentAlignmentIcon = () => {
        if (editor.isActive({ textAlign: "center" })) return <AlignCenter className="w-4 h-4" />;
        if (editor.isActive({ textAlign: "right" })) return <AlignRight className="w-4 h-4" />;
        if (editor.isActive({ textAlign: "justify" })) return <AlignJustify className="w-4 h-4" />;
        return <AlignLeft className="w-4 h-4" />;
    };

    const getCurrentHeadingIcon = () => {
        if (editor.isActive("heading", { level: 2 })) return <Heading2 className="w-4 h-4" />;
        if (editor.isActive("heading", { level: 3 })) return <Heading3 className="w-4 h-4" />;
        if (editor.isActive("heading", { level: 4 })) return <Heading4 className="w-4 h-4" />;
        return <Type className="w-4 h-4" />;
    };

    const openLinkInput = () => {
        const attrs = editor.getAttributes("link");
        setLinkUrl(attrs.href || "");
        setIsExternal(attrs.target === "_blank");
        setShowLinkInput(true);
    };

    const applyLink = () => {
        if (linkUrl) {
            editor.chain().focus().extendMarkRange("link").setLink({
                href: linkUrl,
                target: isExternal ? "_blank" : null
            }).run();
        } else {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
        }
        setShowLinkInput(false);
    };

    const removeLink = () => {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        setShowLinkInput(false);
    };

    return (
        <div className="w-full bg-black/30 border border-white/10 rounded-lg overflow-hidden flex flex-col transition-colors hover:bg-black/50 focus-within:bg-black/50">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    icon={<Bold className="w-4 h-4" />}
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    icon={<Italic className="w-4 h-4" />}
                    title="Italic"
                />

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
                        className="p-2 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        {getCurrentHeadingIcon()}
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {showHeadingDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col p-1 min-w-[120px]">
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setParagraph().run();
                                    setShowHeadingDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${!editor.isActive("heading") ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <Type className="w-4 h-4" />
                                <span>Normal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                                    setShowHeadingDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive("heading", { level: 2 }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <Heading2 className="w-4 h-4" />
                                <span>Heading 2</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                                    setShowHeadingDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive("heading", { level: 3 }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <Heading3 className="w-4 h-4" />
                                <span>Heading 3</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().toggleHeading({ level: 4 }).run();
                                    setShowHeadingDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive("heading", { level: 4 }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <Heading4 className="w-4 h-4" />
                                <span>Heading 4</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    icon={<List className="w-4 h-4" />}
                    title="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    icon={<ListOrdered className="w-4 h-4" />}
                    title="Ordered List"
                />
                <div className="w-px h-4 bg-white/10 mx-1" />
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAlignDropdown(!showAlignDropdown)}
                        className="p-2 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        {getCurrentAlignmentIcon()}
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {showAlignDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col p-1 min-w-[120px]">
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setTextAlign("left").run();
                                    setShowAlignDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive({ textAlign: "left" }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <AlignLeft className="w-4 h-4" />
                                <span>Left</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setTextAlign("center").run();
                                    setShowAlignDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive({ textAlign: "center" }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <AlignCenter className="w-4 h-4" />
                                <span>Center</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setTextAlign("right").run();
                                    setShowAlignDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive({ textAlign: "right" }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <AlignRight className="w-4 h-4" />
                                <span>Right</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    editor.chain().focus().setTextAlign("justify").run();
                                    setShowAlignDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-white/10 text-left ${editor.isActive({ textAlign: "justify" }) ? "text-accent" : "text-zinc-400 hover:text-white"
                                    }`}
                            >
                                <AlignJustify className="w-4 h-4" />
                                <span>Justify</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="relative">
                    <ToolbarButton
                        onClick={openLinkInput}
                        isActive={editor.isActive("link")}
                        icon={<LinkIcon className="w-4 h-4" />}
                        title="Link"
                    />
                    {showLinkInput && (
                        <div className="absolute top-full right-0 mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-xl p-2 z-50 flex items-center gap-2 min-w-[300px]">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent font-mono pr-16"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applyLink();
                                        if (e.key === 'Escape') setShowLinkInput(false);
                                    }}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={applyLink}
                                        className="px-2 py-0.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-light transition-colors"
                                        title="Apply Link"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={removeLink}
                                className="p-1.5 rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors border border-white/10"
                                title="Remove Link"
                            >
                                <Unlink className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExternal(!isExternal)}
                                className={`p-1.5 rounded hover:bg-white/10 transition-colors border border-white/10 ${isExternal ? "text-accent" : "text-zinc-400"
                                    }`}
                                title={isExternal ? "Open in new tab (On)" : "Open in new tab (Off)"}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setShowLinkInput(false)}
                                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Cancel"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    );
}

function ToolbarButton({
    onClick,
    isActive,
    icon,
    title
}: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ReactNode;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-2 rounded transition-colors ${isActive
                ? "bg-accent text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
        >
            {icon}
        </button>
    );
}
