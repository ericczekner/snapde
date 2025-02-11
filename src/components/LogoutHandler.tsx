"use client"
export default function LogoutHander()
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

        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleLogout}>Logout</button>

    )
}