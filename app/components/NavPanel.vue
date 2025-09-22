<template>
    <nav class="navigation">
        <ul class="navigation__list">
            <li class="navigation__item">
            <NuxtLink to="/" class="navigation__link">Home</NuxtLink>
            </li>
            <li class="navigation__item">
            <NuxtLink to="/about" class="navigation__link">About</NuxtLink>
            </li>
            <li class="navigation__item">
            <NuxtLink to="/videos" class="navigation__link">Videos</NuxtLink>
            </li>
        </ul>
    </nav>
</template>

<style lang="scss" scoped>
.navigation {
  &__list {
    display: flex;
    gap: 1rem;

    list-style: none;
  }

  &__item {
    padding: 12px 16px;
  }

  &__link {
    color: black;

    text-decoration: none;


    &:open {
      color: black;
    }
  }
}
</style>