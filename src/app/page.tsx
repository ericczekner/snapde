//The main home page

"use client"
import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Image, Button } from "@nextui-org/react"
import { ArrowUpTrayIcon, ClockIcon } from "@heroicons/react/24/outline";
export default function Home()
{
  return (
    <div className="justify-center flex flex-wrap gap-4">
      <Card className="max-w-[400px]">
        <CardHeader className="flex gap-3">
          <ArrowUpTrayIcon className="h-12 w-12 text-secondary" />
          <div className="flex flex-col">
            <p className="text-md">Upload CSV</p>
            <p className="text-small text-default-500">Create a DE by uploading a CSV</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p>Select a csv and let SnapDex create the data extension for you!</p>
        </CardBody>
        <Divider />
        <CardFooter>
          <Button color="primary" size="md">
            <Link href="/upload" className="text-white">Upload</Link>
          </Button>
        </CardFooter>
      </Card>
      <Card className="max-w-[400px]">
        <CardHeader className="flex gap-3">
          <ClockIcon className="h-12 w-12 text-secondary" />
          <div className="flex flex-col">
            <p className="text-md">DE History</p>
            <p className="text-small text-default-500">See the history of a DE</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p>Select a data extension, view its history, and revert changes quickly!</p>
        </CardBody>
        <Divider />
        <CardFooter>
          <Button color="primary" size="md">
            <Link href="/history" className="text-white">History</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>

  );
}
