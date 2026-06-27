\# Cipher



> A sci-fi themed terminal UI for system monitoring, network analysis, and penetration testing.





Cipher is a powerful, customizable terminal emulator with a hacker aesthetic. Built for cybersecurity professionals, developers, and system administrators who want a terminal that looks as good as it performs.



\*\*Based on \[edex-ui](https://github.com/GitSquared/edex-ui) — extended and customized for modern use.\*\*



\---



\## ✨ Features



\### Core Features

\- \*\*Real-time System Monitoring\*\* - CPU, RAM, disk usage, and process tracking

\- \*\*Network Analysis\*\* - Connection info, netstat integration, network monitoring

\- \*\*File System Browser\*\* - Fast file navigation with icon support

\- \*\*Customizable Themes\*\* - 20+ built-in themes, create your own

\- \*\*Multi-platform\*\* - Windows, macOS, Linux support

\- \*\*Modular Design\*\* - Pick and choose what you need


## Cloud Sync & Telemetry

Cipher includes an optional Cloud Sync feature that is **enabled by default**.
When enabled, Cipher sends basic system telemetry (OS, CPU, RAM, uptime,
hostname) to a private dashboard and performs a license/integrity check.

**No personal files, keystrokes, or terminal contents are ever collected.**

You can disable Cloud Sync at any time:
- Click "Disable" on the first-run notice, or
- Set `"cloudSync": false` in your settings.json

This feature exists to detect unauthorized forks and rebrands of Cipher.



\### Advanced Features

\- Process list with detailed info

\- Hardware inspection panel

\- Audio notifications for events

\- Keyboard customization (QWERTY, DVORAK, COLEMAK, etc.)

\- Media player integration

\- Connection information display

\- Fuzzy file finder

\- Responsive grid layout system



\---



\## 🚀 Quick Start



\### Requirements

\- Node.js 14+ 

\- npm or yarn



\### Installation



```bash

git clone https://github.com/Hirafay/cipher.git

cd cipher

npm install

npm start

```



The app will launch in development mode.



\---



\## 🔨 Building



\### Build for Your Platform



```bash

npm run build

```



This generates:

\- \*\*Windows\*\*: `cipher.exe` installer

\- \*\*macOS\*\*: `cipher.dmg`

\- \*\*Linux\*\*: `cipher.AppImage`



Binaries are in the `dist/` folder.



\### Development Build



```bash

npm run dev

```



\---



\## 🎨 Customization



\### Themes



Themes are JSON files in `src/assets/themes/`. Each theme defines:

\- Color palette (accent, background, text)

\- Font family and size

\- Terminal styling



\*\*Create your own theme:\*\*



1\. Copy an existing theme: `cp src/assets/themes/matrix.json src/assets/themes/my-theme.json`

2\. Edit colors and settings

3\. Restart the app

4\. Select your theme from settings



Example theme structure:

```json

{

&#x20; "name": "My Custom Theme",

&#x20; "colors": {

&#x20;   "bg": "#0a0e27",

&#x20;   "text": "#00ff00",

&#x20;   "accent": "#ff00ff"

&#x20; }

}

```



\### Keyboard Layouts



Layouts are in `src/assets/kb\_layouts/`. Supports:

\- QWERTY (US, UK, etc.)

\- DVORAK

\- COLEMAK

\- BÉPO (French)

\- And more



\### Modules



Modules are individual UI panels. Disable unused ones in config to improve performance.



\---



\## 📋 Configuration



Edit `src/config.json` (or create it) to customize:



```json

{

&#x20; "theme": "matrix",

&#x20; "layout": "default",

&#x20; "modules": \["terminal", "sysinfo", "netstat"],

&#x20; "audioEnabled": true,

&#x20; "fontSize": 12

}

```



\---



\## 🛠️ Development



\### Project Structure
cipher/

├── src/

│   ├── assets/        # Themes, icons, audio, fonts

│   ├── classes/       # Module classes

│   ├── css/           # Stylesheets

│   ├── _boot.js       # Bootstrap

│   ├── _renderer.js   # Renderer process

│   └── ui.html        # Main UI

├── package.json

└── README.md

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

---

## 🔐 License

**GPL-3.0** - See `LICENSE` file for details.

This project is free and open-source. You're free to use, modify, and distribute it under the GPL-3.0 terms.

---

## 📝 Credits

**Cipher** is built on the foundation of **[edex-ui](https://github.com/GitSquared/edex-ui)** by GitSquared.

We've customized, extended, and enhanced the original codebase with:
- New features and modules
- Performance optimizations
- UI/UX improvements
- Security enhancements
- Modern tooling updates

The original edex-ui project is an amazing open-source terminal UI that served as the perfect base for Cipher.

**Thank you GitSquared for creating edex-ui.**

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Create themes

---

## ⚖️ Disclaimer

Cipher is for authorized testing and system administration only. Unauthorized access to computer systems is illegal. Use responsibly.

---

**Made with 🖤 by Hirafay**

Follow for updates: [GitHub](https://github.com/Hirafay) 

