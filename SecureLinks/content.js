/**
 * @author  Spencer Harman
 * @file    content.js
 * This content script runs on your Gmail pages to check link safety
 * using the Google Safe Browsing API.
 * API calls are routed through the background script to get past CORS issues.
 */

/**
 * Checks a URL's safety by sending a message to the background script
 * @param {string} url          The URL to check
 * @returns {Promise<Object>}   A promise that ends up being an object with isSafe and threatType fields
 */
async function checkLinkSafetyViaBackground( url ) {
    try {
        // Send a message to background script
        const response = await chrome.runtime.sendMessage( { action: "checkUrl", url: url } );

        // The background script will return an object
        if ( response && response.status === "success" ) {
            return response.data;
        } else if ( response && response.status === "error" ) {
            return { isSafe: false, threatType: `BACKGROUND_ERROR: ${response.message}` };
        } else {
            return { isSafe: false, threatType: "UNEXPECTED_RESPONSE" };
        }
    } catch ( error ) {
        return { isSafe: false, threatType: `MESSAGE_SEND_ERROR: ${error.message}` };
    }
}

// DOM Stuff

/**
 * Makes and appends a safety indicator element next to a link
 * @param {HTMLElement} linkElement     The <a> element to attach the indicator to
 * @param {string} status               'loading', 'safe', 'unsafe', or 'error'
 * @param {string} message              The message to display
 */
function updateSafetyIndicator( linkElement, status, message = '' ) {
    let indicator = linkElement.nextElementSibling;

    if ( !indicator || !indicator.classList.contains( 'link-safety-indicator' ) ) {
        indicator = document.createElement( 'span' );
        indicator.classList.add( 'link-safety-indicator' );
        indicator.style.marginLeft = '5px';
        indicator.style.fontSize = '0.85em';
        indicator.style.fontWeight = 'bold';
        indicator.style.padding = '2px 5px';
        indicator.style.borderRadius = '3px';
        indicator.style.whiteSpace = 'nowrap';
        indicator.style.verticalAlign = 'middle';
        indicator.style.display = 'inline-block';
        linkElement.parentNode.insertBefore( indicator, linkElement.nextSibling );
    }

    if ( status === 'loading' ) {
        // Not yet
        indicator.textContent = '⏳ Checking...';
        indicator.style.backgroundColor = '#fff3cd';
        indicator.style.color = '#856404';
        indicator.style.border = '1px solid #ffeeba';
    } else if ( status === 'safe' ) {
        // We like this
        indicator.textContent = '🛡️';
        indicator.style.backgroundColor = '#deebfc';
        indicator.style.color = '#ffffff';
        indicator.style.border = '1px solid #060270';
    } else if ( status === 'unsafe' ) {
        // We don't like this
        indicator.textContent = `🚨 Unsafe: ${message}`;
        indicator.style.backgroundColor = '#f8d7da';
        indicator.style.color = '#721c24';
        indicator.style.border = '1px solid #f5c6cb';
    } else if ( status === 'error' ) {
        // This is also bad
        indicator.textContent = `🚫 Error: ${message}`;
        indicator.style.backgroundColor = '#e2e3e5';
        indicator.style.color = '#383d41';
        indicator.style.border = '1px solid #d6d8db';
    }
}

/**
 * Processes a single link: puts up a loading indicator, \
 * checks its safety, and then updates the indicator
 * @param {HTMLElement} linkElement     The <a> element to process
 */
async function processSingleLink( linkElement ) {
    const href = linkElement.href;
    if ( !href || !href.startsWith( 'http' ) ) {
        return;
    }

    updateSafetyIndicator( linkElement, 'loading' );

    try {
        const result = await checkLinkSafetyViaBackground( href );

        if ( result.isSafe ) {
            updateSafetyIndicator( linkElement, 'safe' );
        } else {
            const threatMessage = result.threatType ? result.threatType.replace( /_/g, ' ' ) : "Unknown Threat";
            updateSafetyIndicator( linkElement, 'unsafe', threatMessage );
        }
    } catch ( error ) {
        updateSafetyIndicator( linkElement, 'error', 'Check Failed' );
    }
}

/**
 * Finds all links within a particular element and processes
 * @param {HTMLElement} element     The HTML element to search for links within
 */
function processLinksInElement( element ) {
    if ( !element ) return;

    const links = element.querySelectorAll( 'a[href]:not( .go ):not( .gb_Ia ):not( .aso ):not( .J-Ke ):not( .J-Jr ):not( .msg )' );

    links.forEach( link => {
        if ( !link.nextElementSibling || !link.nextElementSibling.classList.contains( 'link-safety-indicator' ) ) {
            processSingleLink( link );
        }
    } );
}

/**
 * Callback function for the MutationObserver.
 * @param {MutationRecord[]} mutationsList  List of mutations observed
 * @param {MutationObserver} observer       observer instance
 */
function observeEmailContent( mutationsList, observer ) {
    for ( const mutation of mutationsList ) {
        if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 ) {
            mutation.addedNodes.forEach( node => {
                if ( node.nodeType === 1 && ( 
                    node.classList.contains( 'a3s' ) ||
                    node.classList.contains( 'gs' ) ||
                    node.querySelector( '.a3s' ) ||
                    node.id === 'canvas_frame' ||
                    node.classList.contains( 'adP' )
                 ) ) {
                    processLinksInElement( node );
                }
            } );
        }
    }
}

// Search the document body for changes
const observerConfig = { childList: true, subtree: true };
const observer = new MutationObserver( observeEmailContent );
observer.observe( document.body, observerConfig );

// Do it on initial load in case an email is already open
document.addEventListener( 'DOMContentLoaded', () => {
    const emailView = document.querySelector( '.aoP' );
    if ( emailView ) {
        processLinksInElement( emailView );
    } else {
        processLinksInElement( document.body );
    }
} );