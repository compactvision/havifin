<?php

namespace Tests\Feature;

use Tests\TestCase;

class LightModeTest extends TestCase
{
    public function test_application_shell_forces_light_color_scheme(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('<meta name="color-scheme" content="only light">', false)
            ->assertSee('style="color-scheme: only light"', false)
            ->assertSee('<link rel="icon" href="/favicon.ico" sizes="any">', false)
            ->assertSee('<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">', false)
            ->assertSee('<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">', false)
            ->assertDontSee('/favicon.svg', false)
            ->assertDontSee('prefers-color-scheme: dark', false)
            ->assertDontSee('class="dark"', false);
    }
}
