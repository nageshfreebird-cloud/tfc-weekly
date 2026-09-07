import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "./db.js";

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Included both spellings to prevent lockouts in case of typos in Google Workspace setup
const ALLOWED_MANAGERS = [
    "nagesh@teachforchange.in",
    "aishwariya@teachforchange.in",
    "dileep@teachforchange.in",
    "ayoob@teachforchange.in",
    "nagesh@teachforchane.in",
    "dileep@teachforchane.in",
    "ayoob@teachforchane.in"
];

export async function signInManagerWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        if (!ALLOWED_MANAGERS.includes(user.email.toLowerCase())) {
            await signOut(auth);
            throw new Error("UNAUTHORIZED_EMAIL");
        }
        return user;
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
}

export async function signOutManager() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign-out failed:", error.message);
    }
}

// Route guard for manager pages
export function requireManagerAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Clean up listener once we get the initial state
            if (user && ALLOWED_MANAGERS.includes(user.email.toLowerCase())) {
                resolve(user); // Logged in and authorized
            } else {
                if (user) signOut(auth); // Sign out unauthorized users
                window.location.replace("login.html");
                reject(new Error("Unauthorized"));
            }
        }, (error) => {
            unsubscribe();
            window.location.replace("login.html");
            reject(error);
        });
    });
}

