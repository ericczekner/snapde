import { cookies } from 'next/headers'
import LoginHandler from '@/components/LoginHandler';
import LogoutHandler from '@/components/LogoutHandler';
import { headers } from 'next/headers';

import UploadPage from '@/components/UploadPage';


export default async function Home({ params }: { params: any })
{
  const headersList = await headers();
  const referer = headersList.get('referer');

  const cookieStore = await cookies()

  const sessionToken = cookieStore.get('sessionToken')


  if (referer?.includes('?error=user_not_licensed'))
  {
    console.log("Found error")
    return (
      <div className="items-center gap-8 w-full p-8 mt-10">
        <div className="bg-red-500 text-white rounded-lg p-4">
          You are not licensed to use this application. Please contact your administrator.


        </div>
      </div>
    )

  }

  if (!sessionToken)
  {
    return (
      <LoginHandler />
    );
  }



  return (
    <>
      <LogoutHandler />
      <UploadPage />
    </>
  )
}