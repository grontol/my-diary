import { RouterConfig } from "@pang/router.js";
import { Home } from "./pages/Home.jsx";
import { Diary } from "@/pages/Diary.jsx";
import { Root } from "@/pages/Root.jsx";
import { Actor } from "@/pages/Actor.jsx";
import { Resep } from "@/pages/Resep.jsx";
import { TrackDataView } from "@/pages/TrackData.jsx";
import { Tracking } from "@/pages/Tracking.jsx";

export const routes: RouterConfig[] = [
    {
        path: '',
        component: Root,
        children: [
            {
                path: '',
                component: Home,
            },
            {
                path: 'actor',
                component: Actor,
            },
            {
                path: 'track-data',
                component: TrackDataView,
            },
            {
                path: 'diary',
                component: Diary,
            },
            {
                path: 'tracking',
                component: Tracking,
            },
            {
                path: 'resep',
                component: Resep,
            },
        ]
    },
]