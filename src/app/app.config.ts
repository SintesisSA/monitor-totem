import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideDatabase, getDatabase } from '@angular/fire/database';

const firebaseConfig = {
  apiKey: "AIzaSyBi9jmk8gaPKwG_f59pHFnSVkmwT12e_5E",
  authDomain: "totem-miscuentas.firebaseapp.com",
  databaseURL: "https://totem-miscuentas-default-rtdb.firebaseio.com",
  projectId: "totem-miscuentas",
  storageBucket: "totem-miscuentas.firebasestorage.app",
  messagingSenderId: "1019246024263",
  appId: "1:1019246024263:web:3ad7bfc210d72230b60362",
  measurementId: "G-304X13BC06"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(withNoHttpTransferCache()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideDatabase(() => getDatabase())
  ]
};