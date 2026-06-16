<template>
  <div>
    <!-- hero -->
    <section class="hero-bg text-white py-16 sm:py-20">
      <div class="container-x text-center">
        <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">
          <font-awesome-icon icon="location-dot" class="mr-1" />
          会议地点
        </div>
        <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">耀华国际教育学校</h1>
        <p class="mt-3 text-white/70 text-sm sm:text-base">亦庄校区</p>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <!-- venue info card -->
        <div class="bg-white rounded-md shadow-soft p-6 sm:p-8 mb-8">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div class="space-y-4">
              <h2 class="text-2xl font-bold text-brand-deep flex items-center gap-2">
                <font-awesome-icon icon="map-location-dot" class="text-brand-blue" />
                会议地点
              </h2>
              <div class="space-y-2 text-slate-600 text-sm sm:text-base">
                <p>
                  <span class="font-semibold text-slate-700">学校：</span>
                  耀华国际教育学校（亦庄校区）
                </p>
                <p>
                  <span class="font-semibold text-slate-700">地址：</span>
                  北京市大兴区经济技术开发区凉水河二街29号院
                </p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <a
                :href="navUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary !px-6 !py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <font-awesome-icon icon="location-dot" />
                到这里去
              </a>
              <a
                :href="mapSearchUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-brand-blue bg-brand-blue/10 rounded-full hover:bg-brand-blue/20 transition"
              >
                <font-awesome-icon icon="map" />
                在百度地图中打开
              </a>
            </div>
          </div>
        </div>

        <!-- embedded map -->
        <div class="bg-white rounded-md shadow-soft overflow-hidden border border-slate-200">
          <div class="relative w-full" style="height: 500px">
            <iframe
              :src="mapEmbedUrl"
              class="absolute inset-0 w-full h-full border-0"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer"
            ></iframe>
          </div>
        </div>

        <!-- tips -->
        <div class="mt-6 text-center text-xs text-slate-400">
          <p>提示：在手机上点击「到这里去」按钮可直接打开百度地图进行导航</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const venueName = '耀华国际教育学校亦庄校区';

// Baidu Map search URL (for opening in new tab)
const mapSearchUrl = `https://map.baidu.com/search/${encodeURIComponent(venueName)}`;

// Baidu Map embed URL for iframe — use POI share URL to center precisely on the school
const mapEmbedUrl = `https://map.baidu.com/poi/${encodeURIComponent('耀华国际教育学校(亦庄校区)')}/@12972201.41,4804985.05,19z?uid=d78a4c8e525ae4cf9ff77921&ugc_type=3&ugc_ver=1&device_ratio=2&compat=1&pcevaname=pc4.1&querytype=detailConInfo&da_src=shareurl`;

// Baidu Map navigation URL — opens Baidu Map app on mobile or web navigation
const navUrl = `https://api.map.baidu.com/direction?destination=${encodeURIComponent(venueName)}&mode=driving&output=html&src=webapp`;
</script>
