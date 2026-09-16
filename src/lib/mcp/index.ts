import { defineMcp } from "@lovable.dev/mcp-js";

import getAboutTool from "./tools/get-about";
import getBookingAvailabilityTool from "./tools/get-booking-availability";
import getProjectsTool from "./tools/get-projects";
import getServicesTool from "./tools/get-services";

export default defineMcp({
  name: "skale-visuals",
  title: "Skale Visuals",
  version: "0.1.0",
  instructions:
    "Outils publics de Skale Visuals, agence de montage vidéo et de clipping. `get_services` liste les prestations, `get_projects` les projets mis en avant, `get_about` la présentation de l'agence et de ses fondateurs, `get_booking_availability` les disponibilités pour réserver un appel.",
  tools: [getServicesTool, getProjectsTool, getAboutTool, getBookingAvailabilityTool],
});
