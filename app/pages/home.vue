<template>
  <div class="home">
    <section class="home__hero">
      <div class="home__hero-shape home__hero-shape_primary" />
      <div class="home__hero-shape home__hero-shape_secondary" />
      <div class="home__container home__hero-content">
        <h1 class="home__hero-title">{{ t('home.hero.title') }}</h1>
        <p class="home__hero-description">{{ t('home.hero.description') }}</p>
        <div class="home__hero-actions">
          <NuxtLink class="home__hero-button home__hero-button_primary" to="/register">
            {{ t('home.hero.primaryCta') }}
          </NuxtLink>
          <NuxtLink class="home__hero-button home__hero-button_secondary" to="/lessons">
            {{ t('home.hero.secondaryCta') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="home__about">
      <div class="home__container home__about-grid">
        <div class="home__about-text">
          <h2 class="home__section-title">{{ t('home.about.title') }}</h2>
          <p class="home__section-paragraph">{{ t('home.about.paragraph1') }}</p>
          <p class="home__section-paragraph">{{ t('home.about.paragraph2') }}</p>
        </div>
        <div :aria-label="t('home.about.imageAlt')" class="home__about-image" role="img" />
      </div>
    </section>

    <section class="home__features">
      <div class="home__container">
        <div class="home__features-header">
          <h2 class="home__section-title">{{ t('home.features.title') }}</h2>
          <p class="home__section-subtitle">{{ t('home.features.subtitle') }}</p>
        </div>
        <div class="home__features-grid">
          <article class="home__feature-card">
            <span aria-hidden="true" class="home__feature-icon">🎬</span>
            <h3 class="home__feature-title">{{ t('home.features.items.video.title') }}</h3>
            <p class="home__feature-description">
              {{ t('home.features.items.video.description') }}
            </p>
          </article>
          <article class="home__feature-card">
            <span aria-hidden="true" class="home__feature-icon">🗣️</span>
            <h3 class="home__feature-title">{{ t('home.features.items.dialogues.title') }}</h3>
            <p class="home__feature-description">
              {{ t('home.features.items.dialogues.description') }}
            </p>
          </article>
          <article class="home__feature-card">
            <span aria-hidden="true" class="home__feature-icon">💡</span>
            <h3 class="home__feature-title">{{ t('home.features.items.culture.title') }}</h3>
            <p class="home__feature-description">
              {{ t('home.features.items.culture.description') }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="home__reasons">
      <div class="home__container">
        <div class="home__reasons-header">
          <h2 class="home__section-title">{{ t('home.why.title') }}</h2>
          <p class="home__section-subtitle">{{ t('home.why.subtitle') }}</p>
        </div>
        <div class="home__reasons-grid">
          <article class="home__reason-card">
            <span aria-hidden="true" class="home__reason-icon">✈️</span>
            <div class="home__reason-content">
              <h3 class="home__reason-title">{{ t('home.why.items.travel.title') }}</h3>
              <p class="home__reason-description">
                {{ t('home.why.items.travel.description') }}
              </p>
            </div>
          </article>
          <article class="home__reason-card">
            <span aria-hidden="true" class="home__reason-icon">🤝</span>
            <div class="home__reason-content">
              <h3 class="home__reason-title">{{ t('home.why.items.connect.title') }}</h3>
              <p class="home__reason-description">
                {{ t('home.why.items.connect.description') }}
              </p>
            </div>
          </article>
          <article class="home__reason-card">
            <span aria-hidden="true" class="home__reason-icon">💼</span>
            <div class="home__reason-content">
              <h3 class="home__reason-title">{{ t('home.why.items.career.title') }}</h3>
              <p class="home__reason-description">
                {{ t('home.why.items.career.description') }}
              </p>
            </div>
          </article>
          <article class="home__reason-card">
            <span aria-hidden="true" class="home__reason-icon">🧠</span>
            <div class="home__reason-content">
              <h3 class="home__reason-title">{{ t('home.why.items.brain.title') }}</h3>
              <p class="home__reason-description">
                {{ t('home.why.items.brain.description') }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <footer class="home__footer">
      <div class="home__container home__footer-content">
        <p class="home__footer-text">{{ t('home.footer.copyright') }}</p>
        <div class="home__footer-links">
          <a class="home__footer-link" href="#">{{ t('home.footer.privacy') }}</a>
          <a class="home__footer-link" href="#">{{ t('home.footer.terms') }}</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  color: #0f172a;

  &__container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 24px;
    position: relative;
    z-index: 1;
    box-sizing: border-box;
  }

  &__hero {
    position: relative;
    padding: 120px 0 104px;
    text-align: center;
    background: linear-gradient(135deg, #f3f4f6 0%, #e0f2fe 45%, #ede9fe 100%);
    overflow: hidden;
  }

  &__hero-shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.4;

    &_primary {
      top: -80px;
      left: -80px;
      width: 280px;
      height: 280px;
      background: rgba(139, 92, 246, 0.45);
    }

    &_secondary {
      right: -40px;
      bottom: -80px;
      width: 220px;
      height: 220px;
      background: rgba(167, 139, 250, 0.5);
    }
  }

  &__hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  &__hero-title {
    max-width: 780px;
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__hero-description {
    max-width: 640px;
    margin: 0;
    font-size: 18px;
    line-height: 1.7;
    color: #4b5563;
  }

  &__hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  &__hero-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 14px 32px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 16px;
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
    text-decoration: none;

    &_primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
      color: #ffffff;
      box-shadow: 0 18px 36px rgba(139, 92, 246, 0.35);
    }

    &_secondary {
      background: #ffffff;
      color: #374151;
      border: 1px solid rgba(79, 70, 229, 0.15);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
    }

    &:hover {
      transform: translateY(-2px);
    }
  }

  &__about {
    padding: 112px 0;
    background: #f9fafb;
  }

  &__about-grid {
    display: grid;
    gap: 32px;
    align-items: center;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__about-text {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  &__section-title {
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 700;
    margin: 0;
  }

  &__section-paragraph {
    margin: 0;
    font-size: 18px;
    line-height: 1.7;
    color: #4b5563;
  }

  &__about-image {
    width: 100%;
    height: 340px;
    border-radius: 36px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
    background-image: url('https://videos.openai.com/vg-assets/assets%2Ftask_01k74sk7ymeyxsws1kbvq3jn73%2F1760024022_img_1.webp?se=2025-10-10T05%3A22%3A23Z&sp=r&sv=2024-08-04&sr=b&skoid=1af02b11-169c-463d-b441-d2ccfc9f02c8&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-10T01%3A01%3A05Z&ske=2025-10-10T02%3A11%3A05Z&sks=b&skv=2024-08-04&sig=cGC/CJZkH4y3EbB%2BlUN4I%2BHZdgq26QpoYCPPA8SRY1M%3D&az=oaivgprodscus');
    background-size: cover;
    background-position: center;
  }

  &__features {
    padding: 112px 0;
    background: #ffffff;
  }

  &__features-header {
    text-align: center;
    max-width: 720px;
    margin: 0 auto 56px;
  }

  &__section-subtitle {
    margin: 16px auto 0;
    font-size: 18px;
    line-height: 1.7;
    color: #4b5563;
  }

  &__features-grid {
    display: grid;
    gap: 28px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  &__feature-card {
    background: #ffffff;
    border-radius: 32px;
    padding: 32px 28px;
    text-align: center;
    box-shadow: 0 20px 42px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 28px 60px rgba(15, 23, 42, 0.12);
    }
  }

  &__feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    font-size: 32px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.12);
  }

  &__feature-title {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
  }

  &__feature-description {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: #4b5563;
  }

  &__reasons {
    padding: 112px 0;
    background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%);
  }

  &__reasons-header {
    text-align: center;
    max-width: 760px;
    margin: 0 auto 56px;
  }

  &__reasons-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  &__reason-card {
    display: flex;
    gap: 16px;
    padding: 24px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 18px 36px rgba(79, 70, 229, 0.12);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
    backdrop-filter: blur(4px);

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 52px rgba(79, 70, 229, 0.16);
    }
  }

  &__reason-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgba(139, 92, 246, 0.14);
    font-size: 28px;
  }

  &__reason-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__reason-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  &__reason-description {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: #4b5563;
  }

  &__footer {
    background: #ffffff;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    padding: 28px 0;
  }

  &__footer-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;

    @media (min-width: 768px) {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  &__footer-text {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }

  &__footer-links {
    display: flex;
    gap: 20px;
  }

  &__footer-link {
    font-size: 14px;
    color: #6b7280;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #8b5cf6;
    }
  }

  @media (max-width: 640px) {
    &__hero {
      padding: 96px 0 88px;
    }

    &__hero-description,
    &__section-paragraph,
    &__section-subtitle,
    &__feature-description,
    &__reason-description {
      font-size: 16px;
    }

    &__about-image {
      height: 260px;
    }
  }
}
</style>
