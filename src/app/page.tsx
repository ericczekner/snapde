"use client";
import
{
  Button,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Select,
  Alert,
  SelectItem,
  Checkbox
} from "@nextui-org/react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)


  useEffect(() =>
  {
    const init = async () =>
    {
      try
      {


        // Get the hostname and stack information
        const hostname = window.location.hostname;
        const stackInfo = await getStackInfo(hostname);
        console.log(hostname)
        if (!stackInfo)
        {
          setError("You do not appear to be logged into Marketing Cloud.");
          return;
        }

        // Validate the user session
        const user = await validateUser(stackInfo.urlEtmc);
        if (!user)
        {
          setError("You are not logged in to Salesforce Marketing Cloud.");
          return;
        }

        // Set the user information
        setUserInfo(user);
      } catch (err)
      {

        setError("An unexpected error occurred. Please try again.");
      } finally
      {
        setLoading(false);
      }
    };

    init();
  }, []);



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

          const fieldArr: field[] = Object.keys(result.data[0] || {}).map((key) =>
          {
            const columnValues = result.data.map((row) => row[key] || "").slice(0, 100); // Take first 100 values for sampling
            const guessedType = guessFieldType(columnValues);

            // Default precision and scale
            let precision: string | undefined;
            let scale: string | undefined;

            if (guessedType === "Decimal")
            {
              let maxPrecision = 0;
              let maxScale = 0;

              columnValues.forEach((value) =>
              {
                if (!isNaN(Number(value)))
                {
                  const [integerPart, fractionalPart] = value.split(".");
                  const integerDigits = integerPart?.length || 0;
                  const fractionalDigits = fractionalPart?.length || 0;

                  maxPrecision = Math.max(maxPrecision, integerDigits + fractionalDigits);
                  maxScale = Math.max(maxScale, fractionalDigits);
                }
              });

              precision = maxPrecision.toString();
              scale = maxScale.toString();
            }

            return {
              name: key,
              type: guessedType,
              length: guessedType === "Text" || guessedType === "Phone" ? "50" :
                guessedType === "EmailAddress" ? "254" :
                  guessedType === "Locale" ? "5" :
                    "",
              precision: precision, // Set calculated precision for Decimal
              scale: scale,         // Set calculated scale for Decimal
              isPrimaryKey: false,
              isNullable: true,
              defaultValue: "",
            };
          });


          setDeConfig({
            name: file.name.substring(0, file.name.indexOf(".csv")),
            fields: fieldArr,
            isSendable: false,
            isTestable: false,
          });

          setTableData(result.data as any);
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

    if (deConfig.isSendable && deConfig.subscriberKey === undefined)
    {
      alert("Please select a subscriber key field")
      return;
    }

    console.log(tableData)
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
      updatedFields[index] = { ...updatedFields[index], ...updatedField };
      return { ...prev, fields: updatedFields };
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
    <div className="items-center gap-8 w-full p-8">
      {showAlert.shown && (
        <div className="mb-5">
          <Alert
            title={showAlert.title}
            color={showAlert.type === "success" ? "success" : "danger"}
            onClose={() => setShowAlert({ shown: false, title: "", description: "", type: "success" })}
          >
            {showAlert.description}
          </Alert>
        </div>
      )}
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Welcome, {userInfo.name}</h1>
        <h2>You are logged into {userInfo.businessUnitId}</h2>
        <h1 className="text-3xl font-bold text-primary">Upload CSV</h1>

        {file.name && tableData.length > 0 && (

          <Button
            onPress={createDataExtension}
            size="md"
            color="primary"
            className="text-white"
            isLoading={saving}
            isDisabled={saving}
          >
            Create
          </Button>

        )}

      </div>

      <p className="text-lg text-darkGray">
        Add a CSV file to create a new data extension.
      </p>

      {/* Motion Containers */}
      <div className="w-full gap-4">
        {/* Table Panel */}
        <div
          className={`grid grid-cols-1 items-center bg-gray-50 rounded-lg p-6 shadow  cursor-pointer ${tableData.length > 0 ? 'w-full' : 'w-full'}`}
        >
          <div className="w-full">
            {!file.name ? (
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
                        } else
                        {
                          alert(
                            "Invalid file type. Please upload a CSV file."
                          );
                        }
                      }
                    });
                  }
                }}
                className={`${fileEntered ? "border-4" : "border-2"
                  } mx-auto bg-white flex flex-col w-full max-w-xs h-72 border-dashed items-center justify-center`}
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
                  }}

                />
              </div>
            ) : (
              <div className="relative rounded-md w-full h-24 bg-white flex flex-col items-center justify-center px-10">
                <p className="text-xl text-darkGray">{file.name}</p>
                <XMarkIcon
                  className="absolute top-4 right-4 w-6 h-6 text-red-500 cursor-pointer"
                  onClick={handleResetFile}
                />
              </div>
            )}
            {file.name && tableData.length === 0 && (
              <Button
                onPress={() => uploadFile()}
                size="md"
                color="secondary"
                className="text-darkGray my-5"
                isLoading={tableLoading}
                isDisabled={tableLoading}
              >
                Go
              </Button>
            )}
            {file.name && tableData.length > 0 && (
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
            )}
          </div>
        </div>

        {/* Form Panel */}
        {tableData.length > 0 && (
          <div className="w-full bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold text-primary my-2">Data Extension Configuration</h2>
            <div className="flex flex-row gap-4">

              <Input
                label="Name"
                defaultValue={file.name.substring(0, file.name.indexOf(".csv"))}
                size="md"
                onChange={(e) =>
                  setDeConfig((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <div className="w-full bg-white rounded-lg p-6 shadow flex-col flex gap-4">
                <Checkbox
                  isSelected={deConfig.isSendable}
                  onChange={(e) =>
                    setDeConfig((prev) => ({
                      ...prev,
                      isSendable: e.target.checked,
                      subscriberKey: e.target.checked ? prev.subscriberKey : undefined, // Clear subscriberKey if not sendable
                    }))
                  }
                >
                  Is Sendable
                </Checkbox>
                {deConfig.isSendable && (
                  <div>
                    <Select
                      isRequired={true}
                      label="Subscriber Key Field"
                      placeholder="Select Field"
                      selectedKeys={new Set([deConfig.subscriberKey || ""])}
                      onChange={(selectedKey) =>
                        setDeConfig((prev) => ({ ...prev, subscriberKey: selectedKey.target.value }))
                      }
                    >
                      {deConfig.fields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
                <Checkbox
                  isSelected={deConfig.isTestable}
                  onChange={(e) =>
                    setDeConfig((prev) => ({ ...prev, isTestable: e.target.checked }))
                  }
                >
                  Is Testable
                </Checkbox>
              </div>
            </div>


            <h3 className="text-lg font-bold text-primary my-2">Data Extension Fields Configuration</h3>
            <Table isHeaderSticky={true} aria-label="Fields">
              <TableHeader>
                <TableColumn>Field</TableColumn>
                <TableColumn>Type</TableColumn>
                <TableColumn>Length</TableColumn>
                <TableColumn>Primary Key</TableColumn>
                <TableColumn>Nullable</TableColumn>
                <TableColumn>Default value</TableColumn>
              </TableHeader>
              <TableBody>
                {deConfig.fields.map((field, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        defaultValue={field.name}
                        label="Name"
                        size="sm"
                        onChange={(e) =>
                          updateField(index, { name: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        label={"Type"}
                        placeholder="Data Type"
                        selectedKeys={new Set([field.type])}
                        onChange={(selectedKey) =>
                        {
                          const newType = selectedKey.target.value as string;

                          // Remove length for Decimal fields and set default precision/scale
                          const updatedField: Partial<field> = {
                            type: newType,
                            length: newType === "Decimal" ? undefined : typeToLengthMap[newType] || "",
                            precision: newType === "Decimal" ? "18" : undefined,
                            scale: newType === "Decimal" ? "0" : undefined,
                          };

                          updateField(index, updatedField);
                        }}
                        aria-hidden={false}
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
                            label="Precision"
                            size="sm"
                            type="number"
                            value={field.precision || "18"} // Default precision
                            onChange={(e) => updateField(index, { precision: e.target.value })}
                          />
                          <Input
                            label="Scale"
                            size="sm"
                            type="number"
                            value={field.scale || "0"} // Default scale
                            onChange={(e) => updateField(index, { scale: e.target.value })}
                          />
                        </div>

                      ) : (
                        <Input
                          label="Length"
                          size="sm"
                          type="number"
                          value={field.length}
                          onChange={(e) => updateField(index, { length: e.target.value })}
                          isDisabled={
                            field.type !== "Text"
                          }
                        />
                      )}
                    </TableCell>


                    <TableCell>
                      <Checkbox
                        isSelected={field.isPrimaryKey}
                        onChange={(e) =>
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
                        isDisabled={field.isPrimaryKey} // Disable if primary key
                        onChange={(e) =>
                          updateField(index, { isNullable: e.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        label="Default Value"
                        size="sm"
                        defaultValue={field.defaultValue}
                        onChange={(e) =>
                          updateField(index, {
                            defaultValue: e.target.value,
                          })
                        }
                        isDisabled={
                          field.type === "EmailAddress" ||
                            field.type === 'Phone' ||
                            field.type === 'Locale'
                            || field.isPrimaryKey
                            ? true : false
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
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
