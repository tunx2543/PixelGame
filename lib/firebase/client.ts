'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth'
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore'
import firebaseConfig from '../../firebase-applet-config.json'

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

function hasValidFirebaseConfig(): boolean {
  const projectId = typeof firebaseConfig?.projectId === 'string' ? firebaseConfig.projectId.trim() : ''
  const apiKey = typeof firebaseConfig?.apiKey === 'string' ? firebaseConfig.apiKey.trim() : ''
  const databaseId =
    typeof firebaseConfig?.firestoreDatabaseId === 'string' ? firebaseConfig.firestoreDatabaseId.trim() : ''
  return Boolean(projectId && projectId !== 'remixed-project-id' && apiKey && databaseId)
}

function createFirestoreInstance(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        databaseId,
      )
    } catch {
      return getFirestore(app, databaseId)
    }
  }
  return getFirestore(app, databaseId)
}

export const db = createFirestoreInstance()
export const auth = getAuth(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string
  operationType: OperationType
  path: string | null
  authInfo: {
    userId?: string | null
    email?: string | null
    emailVerified?: boolean | null
    isAnonymous?: boolean | null
    tenantId?: string | null
    providerInfo?: {
      providerId?: string | null
      email?: string | null
    }[]
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo))
  throw new Error(JSON.stringify(errInfo))
}

let connectionPromise: Promise<boolean> | null = null
let onlineListenerBound = false

function isOfflineClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('the client is offline') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('failed to get document because the client is offline')
  )
}

function isFirestoreBackendReachableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  return code === 'permission-denied' || code === 'unauthenticated' || code === 'not-found'
}

export async function testConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!hasValidFirebaseConfig()) {
    console.error('Please check your Firebase configuration.')
    return false
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (!onlineListenerBound) {
      onlineListenerBound = true
      window.addEventListener(
        'online',
        () => {
          connectionPromise = null
          void testConnection()
        },
        { once: true },
      )
    }
    return false
  }
  if (connectionPromise) return connectionPromise

  connectionPromise = (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'))
      return true
    } catch (error) {
      if (isFirestoreBackendReachableError(error)) {
        return true
      }
      if (isOfflineClientError(error)) {
        connectionPromise = null
        console.warn(
          'Firestore backend is temporarily unreachable; continuing in offline fallback mode.',
        )
        return false
      }
      return false
    }
  })()

  return connectionPromise
}

if (typeof window !== 'undefined') {
  const scheduleConnectionCheck = () => {
    setTimeout(() => {
      void testConnection()
    }, 1500)
  }
  if (document.readyState === 'complete') {
    scheduleConnectionCheck()
  } else {
    window.addEventListener('load', scheduleConnectionCheck, { once: true })
  }
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export async function signOutFirebase() {
  return signOut(auth)
}

export function formatFirebaseAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'ยกเลิกการเข้าสู่ระบบ'
    case 'auth/cancelled-popup-request':
      return 'มีหน้าต่างเข้าสู่ระบบเปิดอยู่แล้ว กรุณารอสักครู่แล้วลองใหม่'
    case 'auth/popup-blocked':
      return 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Pop-up แล้วลองใหม่'
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : ''
      return `โดเมน ${host} ยังไม่ได้รับอนุญาตใน Firebase Auth Authorized Domains`
    }
    case 'auth/operation-not-allowed':
      return 'ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase Authentication'
    case 'auth/network-request-failed':
      return 'เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'
    case 'auth/user-disabled':
      return 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว'
    default:
      return code ? `เข้าสู่ระบบไม่สำเร็จ (${code})` : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  }
}
