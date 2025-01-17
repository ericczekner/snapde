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
import { Button, Spinner, Files, File, Input, Checkbox, Card, Alert, AlertContainer, Icon, IconSettings } from "@salesforce/design-system-react";


import { useEffect, useState } from "react";
import Papa from "papaparse";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getStackInfo, validateUser } from "../lib/auth";

type field = {
  name: string,
  type: string,
  length: string,
  precision?: string; // Total digits for Decimal fields
  scale?: string; // Decimal places for Decimal fields
  isPrimaryKey: boolean,
  isNullable: boolean,
  defaultValue: string
}


export default function Upload()
{
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>({
    "id": "NzE3MzM0MDgzOjQ6MQ",
    "key": "7339a846-6129-40c7-90fb-753c918f7fa3",
    "lastUpdated": "2025-01-08T13:45:48.963Z",
    "createdDate": "2021-07-26T17:16:49.973Z",
    "username": "eric.czekner_crossmarket",
    "name": "Eric Czekner",
    "locale": "en-US",
    "utcOffset": "-05:00",
    "email": "eric.czekner@slalom.com",
    "isEtAdmin": false,
    "businessUnitId": 7224602,
    "businessUnitAccountTypeId": 8
  })


  //TODO: Implement authentication logic to properly set up the localized api routes we need.
  // useEffect(() =>
  // {
  //   const init = async () =>
  //   {
  //     try
  //     {
  //       // Extract stack information
  //       const stackInfo = await getStackInfo();
  //       if (!stackInfo)
  //       {
  //         setError("You do not appear to be logged into Salesforce Marketing Cloud.");
  //         return;
  //       }

  //       console.log("Stack Info:", stackInfo);

  //       // Validate the user session
  //       const user = await validateUser(stackInfo.urlEtmc);
  //       if (!user)
  //       {
  //         setError("You are not logged in to Salesforce Marketing Cloud.");
  //         return;
  //       }

  //       // Set the user information
  //       setUserInfo(user);
  //     } catch (err)
  //     {
  //       console.error("Unexpected error during initialization:", err);
  //       setError("An unexpected error occurred. Please try again.");
  //     } finally
  //     {
  //       setLoading(false);
  //     }
  //   };

  //   init();
  // }, []);

  const [file, setFile] = useState({ name: "", url: "", type: "" });
  const [fileEntered, setFileEntered] = useState(false);

  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [deConfig, setDeConfig] = useState<{
    name: string;
    fields: field[];
    isSendable: boolean;
    isTestable: boolean;
    subscriberKey?: string;
  }>({
    name: "",
    fields: [],
    isSendable: false,
    isTestable: false,
  });

  const isCsv = (file: any) =>
  {
    const validMimeTypes = ["text/csv", "application/vnd.ms-excel"];
    return validMimeTypes.includes(file.type) || file.name.endsWith(".csv");
  };

  const [showAlert, setShowAlert] = useState({
    shown: false,
    title: "",
    description: "",
    type: "success",
  });

  const [saving, setSaving] = useState(false);

  const uploadFile = async () =>
  {
    setTableLoading(true);

    if (file.url)
    {
      const response = await fetch(file.url);
      const fileBlob = await response.blob();

      Papa.parse<{ [key: string]: string }>(fileBlob as any, {
        header: true,
        skipEmptyLines: true,
        complete: (result) =>
        {
          console.log("Parsed CSV Data: ", result.data);

          // Check if there is any data in the CSV
          const headers = result.meta.fields || []; // Extract headers
          const hasData = result.data && result.data.length > 0;

          if (!headers.length)
          {
            console.error("The uploaded CSV has no column headers.");
            setError("The uploaded CSV has no column headers. Please check the file and try again.");
            setTableLoading(false);
            return;
          }

          // Generate field configuration based on headers
          const fieldArr: field[] = headers.map((key) => ({
            name: key,
            type: "Text", // Default to 'Text' for all fields
            length: "50",
            precision: undefined,
            scale: undefined,
            isPrimaryKey: false,
            isNullable: true,
            defaultValue: "",
          }));

          // Update state
          setDeConfig({
            name: file.name.substring(0, file.name.indexOf(".csv")),
            fields: fieldArr,
            isSendable: false,
            isTestable: false,
          });

          // Set data table
          setTableData(hasData ? result.data as any : []);

          if (!hasData)
          {
            console.warn("The uploaded CSV has no data, only column headers.");
          }
        },
        error: (err) =>
        {
          console.error("Error parsing CSV: ", err);
        },
      });
    } else
    {
      console.error("No file to upload");
    }

    setTableLoading(false);
  };


  const handleResetFile = () =>
  {
    setFile({ name: "", url: "", type: "" });
    setTableData([]);

    setDeConfig({
      name: "",
      fields: [],
      isSendable: false,
      isTestable: false,
    });
  };


  const createDataExtension = async () =>
  {
    setSaving(true)
    setShowAlert({
      shown: false,
      title: "",
      description: "",
      type: "success",
    })

    if (deConfig.isSendable && deConfig.subscriberKey === undefined)
    {
      alert("Please select a subscriber key field")
      return;
    }

    console.log(deConfig)
    const res = await fetch('https://snapde.vercel.app/api/create-de', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deConfig, file: tableData }),
    })

    const data = await res.json();

    if (data.ok)
    {
      setShowAlert({
        shown: true,
        title: "Data Extension Created",
        description: "Data Extension has been created successfully",
        type: "success",
      })
      handleResetFile()
    }
    else
    {
      setShowAlert({
        shown: true,
        title: "Error",
        description: data.error,
        type: "danger",
      })
    }
    setSaving(false)
  }

  const updateField = (index: number, updatedField: Partial<field>) =>
  {
    setDeConfig((prev) =>
    {
      const updatedFields = [...prev.fields];
      updatedFields[index] = {
        ...updatedFields[index],
        ...updatedField,
        type: updatedField.type || "Text", // Ensure type is never undefined
      };

      // Ensure nullable is false when isPrimaryKey is true
      if (updatedField.isPrimaryKey)
      {
        updatedFields[index].isNullable = false;
      }

      // Ensure nullable is false when field is the subscriber key
      if (deConfig.subscriberKey === updatedFields[index].name)
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

  //helper function to try and determine a fields type
  const guessFieldType = (columnData: string[]): string =>
  {
    // Regex patterns for different types
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?1?\d{10}$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}\/\d{2}\/\d{2}$|^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}(AM|PM)$/i;
    const localeRegex = /^[a-z]{2}-[a-z]{2}$/i; // Matches en-US, fr-FR, en-us, en-ca

    // Check for Boolean
    const isBoolean = columnData.every(
      (value) => ["true", "false", "1", "0", "yes", "no"].includes(value.toLowerCase())
    );
    if (isBoolean) return "Boolean";

    // Check for Email
    const isEmail = columnData.every((value) => emailRegex.test(value));
    if (isEmail) return "EmailAddress";

    // Check for Phone
    const isPhone = columnData.every((value) => phoneRegex.test(value));
    if (isPhone) return "Phone";

    // Check for Date
    const isDate = columnData.every((value) => dateRegex.test(value));
    console.log("isDate", isDate);
    if (isDate) return "Date";

    // Check for Locale
    const isLocale = columnData.every((value) => localeRegex.test(value));
    if (isLocale) return "Locale";

    // Check for Decimal
    const isDecimal = columnData.every((value) => !isNaN(parseFloat(value)) && value.includes("."));
    if (isDecimal) return "Decimal";

    // Check for Number
    const isNumber = columnData.every((value) => !isNaN(parseInt(value)) && !value.includes("."));
    if (isNumber) return "Number";

    // Default to Text
    return "Text";
  };

  if (loading)
  {
    return <div>Loading...</div>
  }

  if (error)
  {
    return <div>Error: {error}</div>
  }


  return (
    <><div className="items-center gap-8 w-full p-8">
      {showAlert.shown && (
        <div className="mb-5">
          <IconSettings iconPath="/icons">
            <AlertContainer>
              <Alert
                dismissable={true}
                icon={showAlert.type === "danger" ? <Icon category="utility" name="error" /> : <Icon category="utility" name="info" />}
                labels={{
                  heading: `${showAlert.title} - ${showAlert.description}`,
                }}

                variant={showAlert.type === "success" ? "success" : "error"}
                style={{ backgroundColor: showAlert.type === "success" ? "green" : "" }}

                onRequestClose={() => setShowAlert({ shown: false, title: "", description: "", type: "success" })}
              >
                {showAlert.description}
              </Alert>
            </AlertContainer>
          </IconSettings>
        </div>
      )}
      {/* Header */}


      <div className="flex w-full items-center justify-between">


        <h1 className="text-3xl font-bold text-primary">Upload CSV</h1>


      </div>

      <p className="text-lg text-darkGray">
        Add a CSV file to create a new data extension.
      </p>

      <div className="w-full gap-4">
        {/* Table Panel */}

        {!file.name ? (
          <div
            className={`grid grid-cols-1 items-center bg-gray-50 rounded-lg p-6 shadow  cursor-pointer ${tableData.length > 0 ? 'w-full' : 'w-full'}`}
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
                          setFile({
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
                className={`${fileEntered ? "border-4" : "border-2"} mx-auto bg-white flex flex-col w-full max-w-xs h-72 border-dashed items-center justify-center`}
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
                      setFile({
                        name: files[0].name,
                        url: blobUrl,
                        type: files[0].type,
                      });
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
                  onClick={handleResetFile}
                />
              </div>
              {file.name && (

                <Button
                  onClick={uploadFile}
                  variant="brand"
                  style={{ width: '5em', height: '3em', marginTop: 20 }}

                  label={tableLoading ?
                    <div style={{ position: 'relative', paddingLeft: 20, paddingRight: 20 }}>
                      <Spinner size="x-small" variant="inverse" hasContainer={false} />
                    </div> : "Go"}
                  disabled={tableLoading}
                />

              )}
            </div>

          </div>
        )}


        {/* Form Panel */}
        {file.name && deConfig.name && (
          <div className="w-full mt-5">

            <div className="flex flex-row gap-4">

              <Card id="DEName-Card" heading="Data Extension Configuration" className="w-full mb-10">
                <div className="px-4">
                  <Input
                    label="Name"
                    defaultValue={file.name.substring(0, file.name.indexOf(".csv"))}
                    size="lg"
                    onChange={(e: any) => setDeConfig((prev) => ({ ...prev, name: e.target.value }))}
                    className="pb-5"
                  />

                  <div className="w-full flex-col flex gap-4 mb-5">
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
                      <div>
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


                  </div>
                </div>
              </Card>


            </div>
            <div className="flex flex-row gap-4">
              <Card id="DEName-Card" heading="Field Configuration" className="w-full mb-10">


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
                            onChange={(e: any) => updateField(index, { name: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
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
                              />
                              <Input

                                size="sm"
                                type="number"
                                value={field.scale || "0"}
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
                            isSelected={field.isNullable}
                            disabled={field.isPrimaryKey || deConfig.subscriberKey === field.name} // Disable if primary key or subscriber key
                            onChange={(e: any) => updateField(index, { isNullable: e.target.checked })}

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
        {file.name && deConfig.name && (
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
              disabled={saving}
            />
          </div>
        )}

      </div>

    </div ></>

  );
}



// //The main home page

// "use client"
// import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Button } from "@nextui-org/react"
// import { ArrowUpTrayIcon, ClockIcon } from "@heroicons/react/24/outline";
// export default function Home()
// {
//   return (
//     <div className="justify-center flex flex-wrap gap-4">
//       <Card className="max-w-[400px]">
//         <CardHeader className="flex gap-3">
//           <ArrowUpTrayIcon className="h-12 w-12 text-secondary" />
//           <div className="flex flex-col">
//             <p className="text-md">Upload CSV</p>
//             <p className="text-small text-default-500">Create a DE by uploading a CSV</p>
//           </div>
//         </CardHeader>
//         <Divider />
//         <CardBody>
//           <p>Select a csv and let SnapDex create the data extension for you!</p>
//         </CardBody>
//         <Divider />
//         <CardFooter>
//           <Button color="primary" size="md">
//             <Link href="/upload" className="text-white">Upload</Link>
//           </Button>
//         </CardFooter>
//       </Card>
//       <Card className="max-w-[400px]">
//         <CardHeader className="flex gap-3">
//           <ClockIcon className="h-12 w-12 text-secondary" />
//           <div className="flex flex-col">
//             <p className="text-md">DE History</p>
//             <p className="text-small text-default-500">See the history of a DE</p>
//           </div>
//         </CardHeader>
//         <Divider />
//         <CardBody>
//           <p>Select a data extension, view its history, and revert changes quickly!</p>
//         </CardBody>
//         <Divider />
//         <CardFooter>
//           <Button color="primary" size="md">
//             <Link href="/history" className="text-white">History</Link>
//           </Button>
//         </CardFooter>
//       </Card>
//     </div>

//   );
// }


{/* {file.name && tableData.length > 0 && (
              <Table
                isStriped
                isHeaderSticky={true}
                aria-label={file.name}
                classNames={{
                  base: "max-h-[520px] overflow-scroll max-w-7xl",
                  table: "min-h-[420px]",
                }}
              >
                <TableHeader>
                  {Object.keys(tableData[0]).map((key) => (
                    <TableColumn key={key}>{key}</TableColumn>
                  ))}
                </TableHeader>
                <TableBody emptyContent={"This file contains no rows."}>
                  {tableData.slice(0, 100).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((cell: any, cellIndex) => (
                        <TableCell key={cellIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {tableData.length >= 100 && (
              <div>
                <p>Only the first 100 rows of data are displayed</p>
              </div>
            )} */}