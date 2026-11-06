<?php

namespace GHOSTLABS\GLIDE\RestRoute;

if ( ! defined( 'ABSPATH' ) ) exit;

interface RestRouteInterface
{
    public function routes() : void;
}