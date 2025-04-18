"use client";
import
{
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
    Select,
    SelectItem,
} from "@nextui-org/react";
import
{
    Button,
    Spinner,
    Files,
    File,
    Input,
    Checkbox,
    Card,

} from "@salesforce/design-system-react";
import { useEffect, useState } from "react";
import Papa from "papaparse";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { isCsv, guessFieldType, validateDeName, validateFieldName } from "../lib/helpers";
import { field } from "../lib/types";
import FolderTree from "@/components/FolderTree";
import LogoutHandler from "./LogoutHandler";

export default function UploadPage()
{
    const [userContext, setUserContext] = useState<{ mid: string, buName: string } | null>(null);
    const [loadingContext, setLoadingContext] = useState(true);
    const [dataFolders, setDataFolders] = useState([]);
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [file, setFile] = useState({ name: "", url: "", type: "" });
    const [fileEntered, setFileEntered] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [statusStep, setStatusStep] = useState<string>("");
    const [showAlert, setShowAlert] = useState({ shown: false, title: "", description: "", type: "success" });
    const [deNameError, setdeNameError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ [key: number]: string | null }>({});
    const [selectedFolder, setSelectedFolder] = useState<any | null>(null);

    const [deConfig, setDeConfig] = useState<{
        name: string;
        fields: field[];
        isSendable: boolean;
        isTestable: boolean;
        subscriberKey?: string;
        folderId?: string;
        dataLength: number;
    }>({ name: "", fields: [], isSendable: false, isTestable: false, folderId: "", dataLength: 0 });

    const api_url = process.env.NODE_ENV === 'development' ? 'https://snapde.ngrok.app' : 'https://snapde.vercel.app';

    useEffect(() =>
    {
        async function fetchContext()
        {
            try
            {
                const res = await fetch("/api/me");
                const data = await res.json();
                if (data.ok) setUserContext({ mid: data.mid, buName: data.buName });
            } finally
            {
                setLoadingContext(false);
            }
        }

        async function fetchFolders()
        {
            const res = await fetch(`${api_url}/api/get-folders`);
            const data = await res.json();
            setSelectedFolder(data[0]);
            setDeConfig(prev => ({ ...prev, folderId: data[0].id }));
            setDataFolders(data);
            setLoadingFolders(false);
        }

        fetchContext();
        fetchFolders();
    }, []);

    const uploadFile = async (file: any) =>
    {
        if (file.url)
        {
            setUploading(true);
            const response = await fetch(file.url);
            const fileBlob = await response.blob();
            setFile({
                name: file.name,
                url: file.url,
                type: file.type,
            });
            Papa.parse<{ [key: string]: string }>(fileBlob as any, {
                header: true,
                skipEmptyLines: true,
                complete: (result) =>
                {
                    // Check if there is any data in the CSV
                    const headers = result.meta.fields || []; // Extract headers
                    const hasData = result.data && result.data.length > 0 && result.data.length < 35000;

                    if (!headers.length)
                    {
                        setShowAlert({
                            shown: true,
                            title: "No headers found",
                            description: "The uploaded CSV has no column headers. Please check the file and try again.",
                            type: "danger",
                        });
                        setUploading(false);
                        return;
                    }

                    const columnData = headers.map((header) => result.data.map((row) => row[header]));

                    // Generate field configuration based on headers, check for validation errors
                    const fieldArr: field[] = headers.map((key, index) =>
                    {
                        const validationError = validateFieldName(key);
                        setFieldErrors((prevErrors) => ({
                            ...prevErrors,
                            [index]: validationError,
                        }));

                        const fieldType = hasData ? guessFieldType(columnData[index], key) : "Text";
                        let fieldLength: string | undefined = "50"; // Default length for Text

                        switch (fieldType)
                        {
                            case "EmailAddress":
                                fieldLength = "254";
                                break;
                            case "Phone":
                                fieldLength = "50";
                                break;
                            case "Locale":
                                fieldLength = "5";
                                break;
                            case "Number":
                            case "Date":
                            case "Boolean":
                                fieldLength = ""; // Empty string for these types
                                break;
                            case "Decimal":
                                fieldLength = ""; // Length is not applicable for Decimal
                                break;
                            default:
                                fieldLength = "50"; // Default length for Text
                                break;
                        }

                        return {
                            name: key,
                            type: fieldType,
                            length: fieldLength,
                            precision: undefined,
                            scale: undefined,
                            isPrimaryKey: false,
                            isNullable: true,
                            defaultValue: "",
                        };
                    });

                    const validationError = file.name ? validateDeName(file.name.substring(0, file.name.indexOf(".csv")) || "") : null;

                    if (validationError)
                    {
                        setdeNameError(validationError);
                    }

                    // Update state
                    setDeConfig((prev) => ({
                        ...prev,
                        name: file.name.substring(0, file.name.indexOf(".csv")),
                        fields: fieldArr,
                        isSendable: false,
                        isTestable: false,
                        folderId: selectedFolder?.id || prev.folderId,
                        dataLength: result.data.length,
                    }));

                    setTableData(hasData ? result.data as any : []);

                    setUploading(false);
                    if (!hasData)
                    {
                        setShowAlert({
                            shown: true,
                            title: "No data found",
                            description: "The uploaded CSV has no data, only column headers. Only a DE will be created.",
                            type: "info",
                        });
                    }
                    if (result.data.length > 35000)
                    {
                        setShowAlert({
                            shown: true,
                            title: "The uploaded CSV has more than 35000 rows. Only a DE will be created.",
                            description: `You will need to upload the data manually until a future update adds this functionality.`,
                            type: "warning",
                        });
                    }
                },
                error: (err) =>
                {
                    setShowAlert({
                        shown: true,
                        title: "Error parsing CSV",
                        description: `There was an error parsing the uploaded CSV. Please check the file and try again: ${err.message}`,
                        type: "danger",
                    });
                    setUploading(false);
                },
            });
        }
    };
    const handleResetFile = () =>
    {
        setFile({ name: "", url: "", type: "" });
        setTableData([]);
        setdeNameError(null);
        setFieldErrors({});

        setDeConfig((prev) => ({
            name: "",
            fields: [],
            isSendable: false,
            isTestable: false,
            subscriberKey: undefined,
            folderId: prev.folderId,
            dataLength: 0
        }));
    };

    const createDataExtension = async () =>
    {
        setSaving(true);
        setShowAlert({
            shown: false,
            title: "",
            description: "",
            type: "success",
        });

        if (deConfig.isSendable && deConfig.subscriberKey === undefined)
        {
            alert("Please select a subscriber key field");
            return;
        }

        console.log(deConfig)

        const res = await fetch(`${api_url}/api/create-de`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deConfig, file: tableData }),
        });

        const data = await res.json();

        if (data.ok)
        {
            console.log("Data: ", data);
            if (data.deCreated === true && data.dataUploaded === true && deConfig.dataLength < 35000)
            {

                setShowAlert({
                    shown: true,
                    title: "Data Extension Created and Data Uploaded!",
                    description: "Data Extension has been created and loaded successfully",
                    type: "success",
                });
            } else if (data.deCreated === true && data.dataUploaded === false && deConfig.dataLength < 35000)
            {

                setShowAlert({
                    shown: true,
                    title: "Data extension created, but there was an error uploading data",
                    description: data.message,
                    type: "warning",
                });
            }
            else if (data.deCreated === true && data.dataUploaded === true && deConfig.dataLength >= 35000)
            {
                setShowAlert({
                    shown: true,
                    title: "Data Extension Created",
                    description: "Data Extension created successfully. However, the data was not uploaded due to the large number of rows. You will need to upload the data manually.",
                    type: "success",
                });
            }
            else if (data.deCreated === true && data.dataUploaded === false && deConfig.dataLength >= 35000)
            {
                setShowAlert({
                    shown: true,
                    title: "Data Extension Created",
                    description: "Data Extension created successfully. However, the data was not uploaded due to the large number of rows. You will need to upload the data manually.",
                    type: "success",
                });
            }
            handleResetFile();

            // Automatically close the alert after 5 seconds
            setTimeout(() =>
            {
                setShowAlert({ shown: false, title: "", description: "", type: "success" });
            }, 5000);
        } else
        {
            setShowAlert({
                shown: true,
                title: "Error",
                description: data.error,
                type: "danger",
            });

            // Automatically close the alert after 5 seconds
            setTimeout(() =>
            {
                setShowAlert({ shown: false, title: "", description: "", type: "success" });
            }, 5000);
        }
        setSaving(false);
    };

    const updateField = (index: number, updatedField: Partial<field>) =>
    {
        setDeConfig((prev) =>
        {
            const updatedFields = [...prev.fields];
            updatedFields[index] = {
                ...updatedFields[index],
                ...updatedField,
            };

            // Ensure nullable is false when isPrimaryKey is true
            if (updatedField.isPrimaryKey)
            {
                updatedFields[index].isNullable = false;
            }

            return { ...prev, fields: updatedFields };
        });
    };

    const handleSubscriberKeyChange = (selectedKey: string) =>
    {
        setDeConfig((prev) =>
        {
            const updatedFields = prev.fields.map((field) => ({
                ...field,
                isNullable: field.name === selectedKey ? false : field.isNullable, // Ensure subscriberKey field is not nullable
            }));

            return {
                ...prev,
                subscriberKey: selectedKey,
                fields: updatedFields,
            };
        });
    };

    const typeToLengthMap: { [key: string]: string } = {
        Text: "50",
        Phone: "50",
        EmailAddress: "254",
        Locale: "5",
        Number: "",
        Date: "",
        Boolean: "",
        Decimal: "10", // Example default length for Decimal
    };

    const fieldTypes = ["Text", "Number", "Date", "Boolean", "EmailAddress", "Phone", "Decimal", "Locale"];


    const handleFolderSelect = (folder: any) =>
    {
        setSelectedFolder(folder);
        setDeConfig((prev) => ({ ...prev, folderId: folder.id }));
        console.log("Selected Folder:", folder);
        console.log(deConfig);
    };



    return (
        <div className="min-h-screen flex">
            <aside className="w-64 bg-white border-r shadow-sm p-6 flex flex-col justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-blue-500 mb-2">SnapDE</h1>
                    {loadingContext ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Spinner size="small" variant="brand" /> Loading context...
                        </div>
                    ) : (
                        userContext && (
                            <p className="text-sm text-gray-800">
                                Connected to MID <strong>{userContext.mid}</strong>
                                <br />({userContext.buName})
                            </p>
                        )
                    )}
                </div>
                <LogoutHandler />
            </aside>

            <main className="flex-1 px-8 py-10 bg-gray-50">
                <section className="mb-6 text-left">
                    <h2 className="text-2xl font-bold text-gray-800">Upload a CSV File</h2>
                    <p className="text-gray-600 text-sm mt-2">Add a CSV file to create a new data extension.</p>
                </section>

                <section className="flex justify-start items-start w-full">
                    <div className="w-full">
                        {/* Table Panel */}

                        {!file.name ? (
                            <div
                                className={`grid grid-cols-1 items-center bg-gray-50 rounded-lg p-6 shadow cursor-pointer ${tableData.length > 0 ? 'w-full' : 'w-full'}`}
                            >
                                <div className="w-full">
                                    <div

                                        onDragOver={(e) =>
                                        {
                                            e.preventDefault();
                                            setFileEntered(true);
                                        }}
                                        onDragLeave={(e) =>
                                        {
                                            e.preventDefault();
                                            setFileEntered(false);
                                        }}
                                        onDrop={(e) =>
                                        {
                                            e.preventDefault();
                                            setFileEntered(false);
                                            if (e.dataTransfer.items)
                                            {
                                                [...e.dataTransfer.items].forEach((item) =>
                                                {
                                                    if (item.kind === "file")
                                                    {
                                                        const file = item.getAsFile();
                                                        if (file && isCsv(file))
                                                        {
                                                            const blobUrl = URL.createObjectURL(file);

                                                            uploadFile({
                                                                name: file.name,
                                                                url: blobUrl,
                                                                type: file.type,
                                                            });
                                                        }
                                                        else
                                                        {
                                                            alert(
                                                                "Invalid file type. Please upload a CSV file."
                                                            );
                                                        }
                                                    }
                                                });
                                            }
                                        }}
                                        className={`border-dashed border-2 rounded-lg h-48 flex items-center justify-center bg-white shadow-sm cursor-pointer transition w-full ${fileEntered ? 'bg-blue-50 border-blue-400 shadow-md' : 'border-gray-300 hover:border-blue-500 hover:shadow-md'}`}
                                    >
                                        <label
                                            htmlFor="file"
                                            className="h-full flex flex-col justify-center text-center"
                                        >
                                            Click to upload or drag and drop
                                        </label>
                                        <input
                                            id="file"
                                            type="file"
                                            className="hidden"
                                            accept=".csv"
                                            onChange={(e) =>
                                            {
                                                const files = e.target.files;
                                                if (files && files[0])
                                                {
                                                    const blobUrl = URL.createObjectURL(files[0]);

                                                    uploadFile({
                                                        name: files[0].name,
                                                        url: blobUrl,
                                                        type: files[0].type,
                                                    })
                                                }
                                            }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`grid grid-cols-2 items-center p-3 ${tableData.length > 0 ? 'w-full' : 'w-full'}`}
                            >
                                <div className="w-full">
                                    <div className="relative gap-4 items-center justify-between">

                                        <Files id={file.name} className="flex-1 flex-row gap-4 items-center justify-between">
                                            <div className="relative">
                                                {/* File Component */}
                                                <File
                                                    id={file.name}
                                                    labels={{
                                                        title: `${file.name}`,
                                                    }}
                                                    assistiveText={{
                                                        image: "Placeholder image",
                                                    }}
                                                    className="flex-1 h-[10em] w-[10em]"
                                                    image={`${file.type === "text/csv" ? "/icons/doctype/csv.svg" : "/file.svg"}`}
                                                />


                                            </div>
                                        </Files>
                                        {/* X Icon */}
                                        <XMarkIcon
                                            className="absolute top-0 left-20 ml-[45px] w-6 h-6 text-red-500 cursor-pointer"
                                            onClick={() => { handleResetFile(), setShowAlert({ shown: false, title: "", description: "", type: "success" }) }}
                                        />
                                    </div>

                                </div>

                            </div>
                        )}

                        {uploading && (
                            <div className="w-full mt-5">
                                <Spinner size="medium" variant="brand" hasContainer={true} />
                            </div>
                        )}

                        {file.name && !uploading && (
                            <div className="mt-2">
                                <Card id="DEConfig-Card" heading="Data Extension Configuration" className="mb-10">
                                    <div className="w-full flex">
                                        <div className="w-1/2">
                                            <div className="px-4">
                                                <Input
                                                    label="Data Extension Name"
                                                    value={deConfig.name} // Ensure this is controlled
                                                    size="lg"
                                                    placeholder="Enter a name for the Data Extension" // Provide a fallback for empty state
                                                    errorText={deNameError}
                                                    onChange={(e: any) =>
                                                    {
                                                        const newName = e.target.value;
                                                        const validationError = validateDeName(newName);
                                                        if (validationError)
                                                        {
                                                            setdeNameError(validationError);
                                                        } else
                                                        {
                                                            setdeNameError(null);
                                                            setDeConfig((prev) => ({ ...prev, name: newName }));
                                                        }
                                                    }}
                                                    className="pb-5"
                                                />


                                                <div className="flex-rows flex gap-x-4">
                                                    <Checkbox
                                                        isSelected={deConfig.isSendable}
                                                        labels={{ label: "Is Sendable" }}
                                                        onChange={(e: any) => setDeConfig((prev) => ({
                                                            ...prev,
                                                            isSendable: e.target.checked,
                                                            subscriberKey: e.target.checked ? prev.subscriberKey : undefined, // Clear subscriberKey if not sendable
                                                        }))}

                                                    />

                                                    <Checkbox
                                                        isSelected={deConfig.isTestable}
                                                        labels={{ label: "Is Testable" }}
                                                        onChange={(e: any) => setDeConfig((prev) => ({ ...prev, isTestable: e.target.checked }))}
                                                    >
                                                        Is Testable
                                                    </Checkbox>
                                                </div>
                                                {deConfig.isSendable && (
                                                    <div className="mt-5">
                                                        <Select
                                                            isRequired={true}
                                                            placeholder="Select SubscriberKey Field"
                                                            selectedKeys={new Set([deConfig.subscriberKey || ""])}
                                                            onChange={(selectedKey) => handleSubscriberKeyChange(selectedKey.target.value)}
                                                            variant="bordered"
                                                            radius="sm"

                                                        >
                                                            {deConfig.fields.map((field) => (
                                                                <SelectItem key={field.name} value={field.name}>
                                                                    {field.name}
                                                                </SelectItem>
                                                            ))}
                                                        </Select>
                                                    </div>
                                                )}
                                                <div className="py-4">
                                                    <p>Save Location: <span className="font-bold">{selectedFolder?.name}</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Folder tree */}
                                        <div className="w-1/2 px-4">
                                            {loadingFolders ? (
                                                <div className="flex justify-center items-center">
                                                    <p className="text-darkGray">Loading Folders. Please wait.</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h2 className="text-md text-darkGray">Select Folder</h2>
                                                    <div className="max-h-[300px] overflow-y-auto">
                                                        <FolderTree
                                                            tree={dataFolders}
                                                            onSelect={handleFolderSelect}
                                                            selectedFolder={selectedFolder}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>

                                {/* Field Configuration */}
                                <div className="flex flex-row gap-4">
                                    <Card id="DEFieldConfig-Card" heading="Field Configuration" className="w-full mb-10">
                                        <Table isHeaderSticky={true} aria-label="Fields" shadow="none">
                                            <TableHeader>
                                                <TableColumn className="bg-transparent">Field</TableColumn>
                                                <TableColumn className="bg-transparent">Type</TableColumn>
                                                <TableColumn className="bg-transparent">Length</TableColumn>
                                                <TableColumn className="bg-transparent">Primary Key</TableColumn>
                                                <TableColumn className="bg-transparent">Nullable</TableColumn>
                                                <TableColumn className="bg-transparent">Default value</TableColumn>
                                            </TableHeader>
                                            <TableBody>
                                                {deConfig.fields.map((field, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Input
                                                                defaultValue={field.name}
                                                                size="sm"
                                                                errorText={fieldErrors[index]}
                                                                onChange={(e: any) =>
                                                                {
                                                                    const newFieldName = e.target.value;
                                                                    const validationError = validateFieldName(newFieldName);
                                                                    setFieldErrors((prevErrors) => ({
                                                                        ...prevErrors,
                                                                        [index]: validationError,
                                                                    }));
                                                                    if (!validationError)
                                                                    {
                                                                        updateField(index, { name: newFieldName });
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell aria-hidden="false">
                                                            <Select
                                                                radius="sm"
                                                                variant="bordered"
                                                                size="sm"
                                                                placeholder="Field Type"
                                                                selectedKeys={new Set([field.type || "Text"])} // Default to 'Text'

                                                                onChange={(selectedKey) =>
                                                                {
                                                                    const newType = selectedKey.target.value as string;

                                                                    // Update the field with the selected type
                                                                    updateField(index, {
                                                                        type: newType,
                                                                        length: newType === "Decimal" ? undefined : typeToLengthMap[newType] || "",
                                                                        precision: newType === "Decimal" ? "18" : undefined,
                                                                        scale: newType === "Decimal" ? "0" : undefined,
                                                                    });
                                                                }}
                                                                style={{ minWidth: 150 }}
                                                            >
                                                                {fieldTypes.map((type) => (
                                                                    <SelectItem key={type} value={type}>
                                                                        {type}
                                                                    </SelectItem>
                                                                ))}
                                                            </Select>
                                                        </TableCell>

                                                        <TableCell>
                                                            {field.type === "Decimal" ? (
                                                                <div className="flex flex-row gap-2">
                                                                    <Input

                                                                        size="sm"
                                                                        type="number"
                                                                        value={field.precision || "18"}
                                                                        onChange={(e: any) => updateField(index, { precision: e.target.value })}
                                                                        disabled={field.type !== "Decimal"}
                                                                    />
                                                                    <Input

                                                                        size="sm"
                                                                        type="number"
                                                                        value={field.scale || "0"}
                                                                        disabled={field.type !== "Decimal"}
                                                                        onChange={(e: any) => updateField(index, { scale: e.target.value })}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <Input

                                                                    size="sm"
                                                                    type="number"
                                                                    value={field.length}
                                                                    onChange={(e: any) => updateField(index, { length: e.target.value })}
                                                                    disabled={field.type !== "Text"}
                                                                />
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            <Checkbox
                                                                isSelected={field.isPrimaryKey}
                                                                onChange={(e: any) =>
                                                                    updateField(index, {
                                                                        isPrimaryKey: e.target.checked,
                                                                        isNullable: e.target.checked ? false : field.isNullable, // Set nullable to false if primary key
                                                                    })
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Checkbox

                                                                disabled={field.isPrimaryKey || deConfig.subscriberKey === field.name} // Disable if primary key or subscriber key
                                                                onChange={(e: any) => updateField(index, { isNullable: e.target.checked })}
                                                                checked={field.isNullable}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input

                                                                size="sm"
                                                                defaultValue={field.defaultValue}
                                                                onChange={(e: any) =>
                                                                    updateField(index, {
                                                                        defaultValue: e.target.value,
                                                                    })
                                                                }
                                                                disabled={field.type === "EmailAddress" ||
                                                                    field.type === 'Phone' ||
                                                                    field.type === 'Locale'
                                                                    || field.isPrimaryKey
                                                                    || deConfig.subscriberKey === field.name
                                                                    ? true : false} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Card>
                                </div>
                            </div>

                        )}
                        {file.name && (
                            <div>
                                <Button
                                    style={{ height: '3em' }}
                                    onClick={createDataExtension}
                                    variant="brand"
                                    className="w-full"
                                    label={saving ?
                                        <div style={{ position: 'relative', paddingLeft: 20, paddingRight: 20 }}>
                                            <Spinner size="x-small" variant="inverse" hasContainer={false} />
                                        </div> : "Create"}
                                    disabled={saving || deNameError || Object.values(fieldErrors).some(error => error !== null) || !deConfig.name}
                                />
                            </div>
                        )}

                    </div>
                </section>
            </main>
        </div>

    );
}
