import { CopilotClient } from "./modules/CopilotClient.js";
//import { SnowEffect } from "./modules/SnowEffect.js";
import { PingManager } from "./modules/PingManager.js";

window.onload = () => {
    new CopilotClient();      // AI + TCP typing
    //new SnowEffect("snowCanvas"); // snow animation
    new PingManager();        // backend status checker
};
window.api.onFadeOut(() => {
    document.getElementById("widgetBox")?.classList.add("fade-out");
});

window.api.onFadeRemove(() => {
    document.getElementById("widgetBox")?.classList.remove("fade-out");
});
