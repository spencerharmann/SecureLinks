/**
 * @author  Spencer Harman
 * @file    background.js
 * This is the background service worker script for the extension.
 * Handles API calls to Google Safe Browsing and gets past CORS restrictions
 * that content scripts might face. It also performs the safe browsing check.
 */

// !!!!!!!!!!!! This API key should be YOUR Google Safe Browsing API Key !!!!!!!!!!!!
const GOOGLE_SAFE_BROWSING_API_KEY = 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY';

/**
 * Performs the actual API call to Google Safe Browsing.
 * This function is called by the message listener.
 * @param {string} url The URL to check.
 * @returns {Promise<Object>} An object with isSafe and threatType fields in it.
 */
async function performSafeBrowsingCheck( url ) {
    if ( !GOOGLE_SAFE_BROWSING_API_KEY || GOOGLE_SAFE_BROWSING_API_KEY === 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY' ) {
        return { isSafe: false, threatType: "API_KEY_MISSING_BACKGROUND" };
    }

    const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;
    const requestBody = {
        client: {
            clientId: "secure-links",
            clientVersion: "1.2"
        },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [
                { "url": url }
            ]
        }
    };

    // Try to fetch the api url
    try {
        const response = await fetch( apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify( requestBody )
        } );

        // issue handling
        if ( !response.ok ) {
            const errorText = await response.text();
            if ( response.status === 400 ) {
                return { isSafe: false, threatType: `API_ERROR_BACKGROUND ( Bad Request )` };
            } else if ( response.status === 403 ) {
                return { isSafe: false, threatType: `API_ERROR_BACKGROUND ( Forbidden - check API Key, quotas, or API enablement )` };
            } else if ( response.status === 404 ) {
                return { isSafe: false, threatType: `API_ERROR_BACKGROUND ( Not Found - check API URL or API enablement )` };
            }
            else {
                return { isSafe: false, threatType: `API_ERROR_BACKGROUND ( ${response.status} )` };
            }
        }

        const data = await response.json();

        if ( data && data.matches && data.matches.length > 0 ) {
            const threatType = data.matches[0].threatType;
            return { isSafe: false, threatType: threatType };
        } else {
            return { isSafe: true, threatType: null };
        }
    } catch ( error ) {
        return { isSafe: false, threatType: `NETWORK_ERROR_BACKGROUND: ${error.message}` };
    }
}

// Listen from the content scripts
chrome.runtime.onMessage.addListener( ( request, sender, sendResponse ) => {
    // Check if checking for URL
    if ( request.action === "checkUrl" && request.url ) {
        // Do the check and send the response back
        performSafeBrowsingCheck( request.url )
            .then( result => {
                sendResponse( { status: "success", data: result } );
            } )
            .catch( error => {
                sendResponse( { status: "error", message: error.message } );
            } );
        
        return true;
    }
} );