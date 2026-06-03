/**
 * DrawerNavigator — Bypassed
 * ─────────────────────────────────────────────
 * Bypasses drawer navigation to mount MainTabNavigator directly.
 */

import React from 'react';
import MainTabNavigator from './MainTabNavigator';

const DrawerNavigator = (props) => {
  return <MainTabNavigator {...props} />;
};

export default DrawerNavigator;
