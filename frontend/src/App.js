import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';

import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Recordings from './components/Recordings';

const App = () => {
  const [user, setUser] = useState(null);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    const sharedCams = localStorage.getItem('sharedCams');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (sharedCams) {
      setCameras(JSON.parse(sharedCams));
    }
  }, []);

  const handleLoginSuccess = (userData, sharedCameras) => {
    setUser(userData);
    setCameras(sharedCameras);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCameras([]);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center relative">
        <Routes>
          <Route path="/" element={!user ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
              <div className="flex flex-col items-center mt-10 w-full">
                <button
                  className="absolute top-4 right-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                  onClick={handleLogout}
                >
                  Logout
                </button>

                <h2 className="text-3xl font-bold mb-4">Welcome, {user.first_name} {user.last_name}</h2>
                <p className="text-lg mb-6">These are your shared cameras:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cameras.map(camera => (
                    <CameraItem key={camera.id} camera={camera} />
                  ))}
                </div>
              </div>
            )}
          />
          <Route 
            path="/camera/:id" 
            element={
              <ProtectedRoute user={user}>
                <Recordings onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

const CameraItem = ({ camera }) => {
  const navigate = useNavigate();

  const handleViewClick = () => {
    navigate(`/camera/${camera.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold mb-2">Camera ID: {camera.id}</h3>
      <p className="text-gray-700 mb-2">Name: {camera.name}</p>
      <p className="text-gray-500">Status: {camera.status}</p>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white mt-5 py-1 px-3 rounded"
        onClick={handleViewClick}
      >
        View
      </button>
    </div>
  );
};

export default App;
