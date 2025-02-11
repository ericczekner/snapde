"use client";
import { useState } from 'react'
import
{
    Button,
    Spinner,
    Files,
    File,
    Input,
    Checkbox,
    Card,
    Alert,
    AlertContainer,
    Icon,
    IconSettings
} from "@salesforce/design-system-react";
export default function LoginHandler()
{


    const [authURI, setAuthURI] = useState<string>('')
    const [clientId, setClientId] = useState<string>('')
    const [loggingIn, setLoggingIn] = useState<boolean>(false)
    const api_url = process.env.NODE_ENV === 'development' ? "https://snapde.ngrok.app" : 'https://snapde.vercel.app';
    const login = async () =>
    {
        setLoggingIn(true)
        console.log("Ready to login: ", clientId)
        console.log("Ready to login: ", authURI)
        const response = await fetch(`${api_url}/api/auth/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId, authURI })
        })
        const data = await response.json()
        if (data.status !== 'ok')
        {
            alert('An error occurred. Please try again.')
            return
        }
        window.location.href = data.authRedirectURL
        setLoggingIn(false)
    }



    return (
        <div className="gap-8 w-full p-8">

            <div className="flex w-full flex-col justify-between mb-3">
                <h1 className="text-3xl font-bold text-primary">Welcome to SnapDE</h1>
                <p className="text-lg text-darkGray">You are not authenticated and we need to fix that.</p>
            </div>

            <div className="flex w-full flex-col justify-between mb-3">
                <Input className="my-2" type="text" placeholder="Auth URI" label="Enter Auth URI" id="authURI" onChange={(e: any) => setAuthURI(e.target.value)} />
                <Input type="text" placeholder="Client ID" label="Enter Client ID" id="clientId" onChange={(e: any) => setClientId(e.target.value)} />
                <p className="text-xs mt-1">If you are unsure of these values please contact your admin.</p>

            </div>
            <div className="my-5 w-full flex flex-col">
                <Button style={{ height: '3em' }} variant="brand" onClick={login} label={loggingIn ?
                    <div style={{ position: 'relative', paddingLeft: 20, paddingRight: 20 }}>
                        <Spinner size="x-small" variant="inverse" hasContainer={false} />
                    </div> : "Submit"}
                    disabled={loggingIn}
                />
            </div>
        </div>
    )
}