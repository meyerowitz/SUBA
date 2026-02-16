// RouteContext.js
import React, { createContext, useState, useContext } from 'react';

const RouteContext = createContext();

export const RouteProvider = ({ children }) => {
  const [selectedRoute, setSelectedRoute] = useState(null);
    const [activeTab, setActiveTab] = useState('Home')
  return (
    <RouteContext.Provider value={{ selectedRoute, setSelectedRoute ,setSelectedRoute, 
      activeTab, 
      setActiveTab}}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRoute = () => useContext(RouteContext);