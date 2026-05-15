<img width="1479" height="846" alt="image" src="https://github.com/user-attachments/assets/0e00e4c2-ef62-4ec0-85ac-aa302fd88c31" /># Soundpad

A high-performance virtual audio router and soundboard interface. Soundpad bridges local audio playback with digital communication platforms, enabling high-fidelity sound injection into live microphone streams

## Core Logic
Soundpad functions as an audio distribution layer. It bifurcates the signal into two parallel streams:
1  **Monitoring Stream:** Real-time feedback to your primary output device
2  **Broadcast Stream:** Direct routing to the VB-Audio virtual bridge which external applications identify as a hardware input

---

## Visuals

### Interface Overview
Minimalist dashboard designed for rapid sound triggering and library management
![Soundpad Interface](<img width="1479" height="846" alt="image" src="https://github.com/user-attachments/assets/3e9a540d-7abe-442e-ba81-95e1d3615058" />
)

### Signal Routing
Configuration panel for managing the virtual passthrough and driver synchronization
![Routing Logic](<img width="1477" height="846" alt="image" src="https://github.com/user-attachments/assets/036ce97b-fe7a-43f2-9daf-6c76509039e1" />
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
