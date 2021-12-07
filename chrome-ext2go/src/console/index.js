import Vue from "vue";
import PopupComponent from "./popup.vue";

Vue.component("popup-component", PopupComponent);

new Vue({
    el: "#app",
    render: createElement => {
        return createElement(PopupComponent);
    }
});
