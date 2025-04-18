"use client"
export default function LogoutHandler()
{
    const handleLogout = async () =>
    {
        const logout = await fetch('/api/logout')
        const result = await logout.json()
        if (result.status === "ok")
        {
            window.location.href = "/"
        }
    }
    return (

        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded" onClick={handleLogout}>Logout</button>

    )
}