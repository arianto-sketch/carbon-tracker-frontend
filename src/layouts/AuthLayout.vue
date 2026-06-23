<template>
  <v-app>
    <v-main class="bg-background">
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">
            <div class="text-center mb-6">
              <v-icon size="48" color="primary">mdi-leaf-circle</v-icon>
              <h1 class="text-h5 font-weight-bold text-primary mt-2">Carbon Tracker</h1>
              <p class="text-body-2 text-medium-emphasis">Logique Internal Tool</p>
            </div>
            <slot />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
