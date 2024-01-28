<template>
    <div class="frame" style="min-height: 100vh; height: 100%">
        <div class="flex c-app-bg min-h-100vh" style="width: 100%" :class="{ blured: $store.state.blurPage }">
            <div id="UserMenu"></div>
            <div v-if="showLoadingSpinner" class="flex all-center" style="height: 100vh"></div>

            <div class="flex column alignItems-center" :class="{ 'w-calc(100%_-_68px)': !mainMenu, 'w-calc(100%_-_328px)': mainMenu }">
                <div class="width-100%">
                    <router-view
                        v-if="
                            !showLoadingSpinner &&
                            ($store.state.authenticated ||
                                global.getMainURL($route).includes('/login') ||
                                global.getMainURL($route).includes('/reset') ||
                                global.getMainURL($route).includes('/404'))
                        "
                        class="width-100% p-8px"
                    ></router-view>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "App",
    components: {},
    data: function () {
        return {};
    },
    computed: {},
    methods: {},
    watch: {},
    async created() {},
    mounted() {},
};
</script>

<style></style>
