import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../components/Home.vue";
import DraftSetup from "../components/DraftSetup.vue";
import GameSetup from "../components/GameSetup.vue";
import DraftBoard from "../components/DraftBoard.vue";
import HearMeOut from "../components/HearMeOut.vue";
import VotingLinks from "../components/VotingLinks.vue";
import Voting from "../components/Voting.vue";
import Results from "../components/Results.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: Home,
    },
    {
      path: "/draft/new",
      component: DraftSetup,
    },
    {
      path: "/draft/:id",
      component: DraftSetup,
      props: true,
    },
    {
      path: "/game/:gameId/setup",
      component: GameSetup,
      props: true,
    },
    {
      path: "/game/:gameId",
      component: DraftBoard,
      props: true,
    },
    {
      path: "/game/:gameId/hear-me-out",
      component: HearMeOut,
      props: true,
    },
    {
      path: "/game/:gameId/voting-links",
      component: VotingLinks,
      props: true,
    },
    {
      path: "/voting",
      component: Voting,
    },
    {
      path: "/game/:gameId/voting",
      component: Voting,
      props: true,
    },
    {
      path: "/game/:gameId/results",
      component: Results,
      props: true,
    },
  ],
});

// Add navigation logging
router.beforeEach((to, from, next) => {
  console.log("[Router] Navigating from:", from.path, "to:", to.path);
  next();
});

router.afterEach((to, from) => {
  console.log("[Router] Navigation completed to:", to.path);
});

export default router;
