# SecureLinks 🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️
![icon128](https://github.com/user-attachments/assets/05ca0d24-7b07-44e4-b385-447d94688a25)

SafeLinks automates your Gmail security by scanning for malicious links in emails using the Google Safe Browsing API v4. When opening an email, SecureLinks will scan for links in your email and determine whether it is a safe URL or not.

## 🛠️Here's how it works:🛠️
This project creates a chrome extension that allows users to check the safety of links in Gmail. This happens through two main parts: **contebnt.js** and **background.js**.
### content.js
This script runs **directly** on Gmail pages. It's job is to find the links on the page and display safety indicators next to them.

**Scans for links:** When a Gmail page loads in (like when you click on an email), content.js scans the page for anchor tags (<a>) that have an href attribute, and are actual web links (starts with http). It also adds a "⏳ Checking..." indicator as a placeholder for the actual icon.

**Safety Check:** Then, it sends a message to the background.js script, passing the URL of the link it wants to check. This is super important because content scripts are restricted by **Cross-Origin Resource Sharing/CORS** policies, which prevents them from making direct API calls to external services if it isn't on the same domain as the host. In this case, Google Safe Browse isn't on the same domain as Gmail, so the background script is necessary. Once the background.js script sends its response back, content.js updates the indicator next to the link:
      -  🛡️: If the link is safe.
      -  🚨 Unsafe: (Threat Type): If the link is unsafe, and displays the type of threat.
      -  🚫 Error: (Message): If there was a problem during the check.

**Monitoring for Changes:** It uses a MutationObserver to watch for changes in the Gmail page content. This ensures that any new links that appear are also scanned and checked. 

### background.js
This script runs in the background and acts as a middleman between the content scirpt and the Google Safe Browse API. Having a background script also allows it to perform long tasks without affecting the web page performance, and can handle requests even when the content scipt's page isn't active.

**API Key Management:** It holds the Google Safe Browse API key, which is important when authenticating requests to the API. If you want to use this for yourslef, ***make sure you replace the "YOUR_GOOGLE_SAFE_BROWSING_API_KEY" with your own!!***

**Listens for Requests:** It listens for messages from content.js. When content.js sends a checkUrl action with a URL, background.js takes it.

**Performs Safe Browse Check:** After getting the request, it creates a new request to the Google Safe Browse API, specifying the URL to check and the types of threats to look for: malware, social engineering, and unwanted software. If the API returns a match, it means the URL is unsafe, and the script extracts the threat type. If no matches are found, the URL is safe. If a problem happens, it has error handling for network issues and various API response statuses. Then, it sends the result back to content.js.

## 📃How To Set This Up (FREE)
1) Go to the Google Cloud Console, and create a new project
2) Go to "APIs & Services > Library"
3) Search for "Google Safe Browsing API" and enable it for your project
4) Go to "APIs & Services > Credentials"
5) Click "Create credentials" and choose "API key"
6) Copy the API key and put it into the background.js placeholder (YOUR_GOOGLE_SAFE_BROWSING_API_KEY)
7) Go to chrome://extensions/, turn on developer mode, and click "Load Unpacked"
8) Select the SecureLinks folder, and you're good to go

# 💻Why This Is Important:💻
The most exploitable part of any system is the person behind it -- even the most secure defenses can be bypassed if an attacker can trick a user into revealing sensitive information, clicking a malicious link, or downloading harmful software. This often happens through **social engineering**, where bad actors trick users into performing certain actions or exposing confidential data.

A very common version of social engineering is **Phishing**, specifically email phishing. Attackers send emails that look legitimate, usually pretending to be trusted organizations or people. These emails typically have malicious links in them designed to take your information or download malware onto your computer. This can be gateways into methods like session fixation.

SecureLinks can help prevent falling for phishing links. By automatically scanning links when you open an email, SecureLinks provides a subtle indicator of safety, and an obvious indicator of danger. The Google Safe Browse API is constantly updated with new malicious links, keeping you safe from even the newest threats. This extension acts as a first line of defense against human targeted attacks, significantly reducing the risk of becoming a victim to phishing attacks and protecting your digital security.
