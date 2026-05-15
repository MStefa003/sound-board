# Soundpad

A high-performance virtual audio router and soundboard interface. Soundpad bridges local audio playback with digital communication platforms, enabling high-fidelity sound injection into live microphone streams

## Core Logic
Soundpad functions as an audio distribution layer. It bifurcates the signal into two parallel streams:
1  **Monitoring Stream:** Real-time feedback to your primary output device
2  **Broadcast Stream:** Direct routing to the VB-Audio virtual bridge which external applications identify as a hardware input

---

## Visuals

### Interface Overview
Minimalist dashboard designed for rapid sound triggering and library management
![Soundpad Interface](<img width="1483" height="848" alt="image" src="https://github.com/user-attachments/assets/ea7f3e0a-76de-4632-aacc-e991d0b16e2d" />
)

### Signal Routing
Configuration panel for managing the virtual passthrough and driver synchronization
![Routing Logic](<img width="1481" height="850" alt="image" src="https://github.com/user-attachments/assets/8017027a-132d-4898-be11-ffd14f6bf1ba" />
)

---

## Technical Architecture
* **Low Latency:** Optimized for real-time audio delivery without processing lag
* **Driver Integration:** Native hooks for **VB-Audio Virtual Cable**
* **Environmental Awareness:** Automatic detection of virtual drivers and hardware status
* **UI Design:** Modern, frameless dark-mode interface built for desktop utility

## Quick Start

### Prerequisites
* [VB-CABLE Virtual Audio Driver](https://vb-audio.com/Cable/) is required for audio bridging
* Node.js environment for local builds

### Deployment
```bash
# Clone the repository
git clone [https://github.com/MStefa003/sound-board.git](https://github.com/MStefa003/sound-board.git)

# Install dependencies
npm install

# Launch application
npm run start
