import React from 'react'
import { useApp } from '../Context/MainContext'
import { useNavigate } from 'react-router-dom'

const AccountPage = () => {
  const { user, setIsAuth, setUser, setToken } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsAuth(false);
    setUser(null);
    setToken(null);
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">My Account</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <p className="mt-1 text-lg text-gray-900">{user.firstName || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <p className="mt-1 text-lg text-gray-900">{user.lastName || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-lg text-gray-900">{user.email}</p>
          </div>

          {user.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <p className="mt-1 text-lg text-gray-900">{user.phoneNumber}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-lg text-gray-900 capitalize">{user.role}</p>
          </div>

          {user.profilePicture && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                className="mt-2 w-20 h-20 rounded-full object-cover"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default AccountPage
