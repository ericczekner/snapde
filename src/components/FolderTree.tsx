import React, { useState } from "react";
import { Icon, IconSettings } from "@salesforce/design-system-react";

interface FolderTreeProps
{
    tree: any[];
    onSelect: (folder: any) => void;
    selectedFolder: any | null;
}

const FolderTree: React.FC<FolderTreeProps> = ({
    tree,
    onSelect,
    selectedFolder,
}) =>
{
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (id: string) =>
    {
        setOpenFolders((prev) =>
        {
            const updated = new Set(prev);
            if (updated.has(id))
            {
                updated.delete(id);
            } else
            {
                updated.add(id);
            }
            return updated;
        });
    };

    return (
        <IconSettings iconPath="/icons">
            <ul style={{ listStyleType: "none", margin: 0, padding: 0 }}>
                {tree.map((folder: any) =>
                {
                    const isOpen = openFolders.has(folder.id);
                    const isSelected = selectedFolder?.id === folder.id;

                    return (
                        <li
                            key={folder.id}
                            style={{
                                padding: "5px 0",
                                display: "block", // Ensures each folder starts on a new line
                            }}
                        >
                            <div
                                onClick={(e) =>
                                {
                                    e.stopPropagation(); // Prevent parent clicks when toggling
                                    folder.children.length > 0 && toggleFolder(folder.id);
                                    onSelect(folder); // Handle folder selection
                                }}
                                style={{
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    backgroundColor: isSelected ? "#e5f3ff" : "transparent", // Highlight selected folder
                                    padding: "5px",
                                    borderRadius: "4px",
                                }}
                            >
                                {/* Toggle Icon */}
                                {folder.children.length > 0 ? (
                                    <span
                                        style={{
                                            marginRight: 8,
                                            fontWeight: "bold",
                                            fontSize: "14px",
                                            minWidth: "12px", // Ensures alignment for +/- icons
                                            textAlign: "center",
                                        }}
                                    >
                                        {isOpen ? "-" : "+"}
                                    </span>
                                ) : (
                                    <span
                                        style={{
                                            marginRight: 8,
                                            minWidth: "12px", // Ensures alignment for non-toggle icons
                                            textAlign: "center",
                                        }}
                                    />
                                )}

                                {/* Folder Icon */}
                                <Icon
                                    category="utility"
                                    name={isOpen ? "opened_folder" : "open_folder"}
                                    size="x-small"
                                    style={{ marginRight: 8 }}
                                />

                                {/* Folder Name */}
                                <span
                                    style={{
                                        fontWeight: isSelected ? "bold" : "normal", // Highlight selected folder name
                                    }}
                                >
                                    {folder.name}
                                </span>
                            </div>

                            {/* Nested Children */}
                            {folder.children.length > 0 && isOpen && (
                                <div style={{ paddingLeft: 20 }}>
                                    <FolderTree
                                        tree={folder.children}
                                        onSelect={onSelect}
                                        selectedFolder={selectedFolder}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </IconSettings>
    );
};

export default FolderTree;
