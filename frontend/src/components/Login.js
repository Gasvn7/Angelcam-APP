import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsloading ] = useState(false);

  const handleLogin = async () => {
    setIsloading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:8000/api/login/', { token });
      const userData = response.data;
      const sharedCameras = await axios.post('http://localhost:8000/api/cameras/', { token });
      const cameras = sharedCameras.data.results;

      localStorage.setItem('token', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('sharedCams', JSON.stringify(cameras))
      onLoginSuccess(userData, cameras);
    } catch (err) {
      setError('Invalid token or unable to fetch user data.');
    } finally {
      setIsloading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md mb-36">
        <h2 className="text-2xl mb-4 text-center font-semibold">Login</h2>
        <h4 className="text-base mb-4 text-center">Insert your Angelcam token</h4>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          {isLoading ? 'Cheking...' : 'Login'}
        </button>
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </div>
    </div>
  );
};

export default Login;
