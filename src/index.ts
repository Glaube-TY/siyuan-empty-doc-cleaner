import {
    Plugin,
    showMessage,
    getFrontend,
    IModel,
} from "siyuan";
import "@/index.scss";
import setPage from "@/page.svelte";
import { svelteDialog } from "./libs/dialog";


const STORAGE_NAME = "menu-config";

export default class PluginSample extends Plugin {

    customTab: () => IModel;
    private isMobile: boolean;


    async onload() {
        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };

        await this.loadData(STORAGE_NAME);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.addIcons(`<symbol id="iconClean" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
<path d="M735.5 65h-447C165 65 65 165 65 288.5v447C65 859 165 959 288.5 959h447c69.9 0 132.3-32.1 173.3-82.4C940.2 838.2 959 789 959 735.5V512 323.1v-34.6C959 165 859 65 735.5 65z" fill="#669DFF"/>
<path d="M534 590.9c0 17.9 9.5 34.4 25 43.3 15.5 8.9 34.6 8.9 50 0 15.5-8.9 25-25.5 25-43.3 0-27.6-22.4-50-50-50-27.6-0.1-50 22.3-50 50z" fill="#E13C42"/>
<path d="M584 641.3c27.6 0 50-22.4 50-50H534c0 27.6 22.4 50 50 50z" fill="#ECFFFF"/>
<path d="M232 449.5s122.6 11.5 217-96.4l233.8 228.5S569.6 694.8 553.8 785L492 751.4l-98.5-70.2 82.9-120.5L360 645.5l-69.2-89.1s60.8-30.4 69.2-66.1c0 0-61.8 25.2-96.4 23.1L232 449.5z" fill="#DB4D29"/>
<path d="M457.3 337.3l241.2 231.6s29.3-24.1 9.4-60.7L517.2 320.5s-27.3-23-59.9 16.8zM739.3 240.8L605.2 371.9l55.6 51.4 129.9-133.1c0-0.1 14.2-62.5-51.4-49.4z" fill="#FEDA14"/>
</symbol>`);


        this.addTopBar({
            icon: "iconClean",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                this.showDialog();
            }
        });
    }
    

    async onunload() {
        showMessage("感谢使用，下次再会！");
    }


    private showDialog() {
        svelteDialog({
            title: `🗑 清理空文档`,
            width: this.isMobile ? "92vw" : "720px",
            constructor: (container: HTMLElement) => {
                return new setPage({
                    target: container,
                    props: {
                        app: this.app,
                    }
                });
            }
        });
    }
}
