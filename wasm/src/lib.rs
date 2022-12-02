#![allow(dead_code)]
use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

use log::error;

cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        pub use self::console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
        pub fn set_panic_hook() {}
    }
}

cfg_if! {
    if #[cfg(feature = "console_log")] {
        fn init_log() {
            use log::Level;
            console_log::init_with_level(Level::Info).expect("error initializing log");
        }
    } else {
        fn init_log() {}
    }
}

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
pub fn init_wasm() -> JsValue {
    init_log();
    serde_wasm_bindgen::to_value("civil-client: v.20210108d").unwrap()
}

#[wasm_bindgen]
pub fn markup_as_ast(markup: &str) -> JsValue {
    match civil_shared::markup_as_ast(markup) {
        Ok(res) => serde_wasm_bindgen::to_value(&res).unwrap(),
        Err(_) => {
            error!("markup_as_ast failed");
            serde_wasm_bindgen::to_value(&"error").unwrap()
        }
    }
}

#[wasm_bindgen]
pub fn markup_as_struct(markup: &str) -> JsValue {
    match civil_shared::markup_as_struct(markup) {
        Ok(res) => serde_wasm_bindgen::to_value(&res).unwrap(),
        Err(_) => {
            error!("markup_as_struct failed");
            serde_wasm_bindgen::to_value(&"error").unwrap()
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Transport3C {
    c0: f64,
    c1: f64,
    c2: f64,
}

impl Transport3C {
    pub fn new(c0: f64, c1: f64, c2: f64) -> Transport3C {
        Transport3C {
            c0,
            c1,
            c2,
        }
    }

    pub fn blank() -> Transport3C {
        Transport3C {
            c0: 0.0,
            c1: 0.0,
            c2: 0.0,
        }
    }
}

impl From<civil_shared::Rgb> for Transport3C {
    fn from(rgb: civil_shared::Rgb) -> Transport3C {
        Transport3C::new(rgb.r.into(), rgb.g.into(), rgb.b.into())
    }
}

impl From<civil_shared::Hsluv> for Transport3C {
    fn from(hsluv: civil_shared::Hsluv) -> Transport3C {
        Transport3C::new(hsluv.h.into(), hsluv.s.into(), hsluv.l.into())
    }
}

#[wasm_bindgen]
pub fn hsl_from_rgb(r: f64, g: f64, b: f64) -> JsValue {
    let hsluv: civil_shared::Hsluv = civil_shared::Rgb::new(r as f32, g as f32, b as f32, 1.0).into();

    let res: Transport3C = hsluv.into();
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[wasm_bindgen]
pub fn rgb_from_hsl(h: f64, s: f64, l: f64) -> JsValue {
    let rgb: civil_shared::Rgb = civil_shared::Hsluv::new(h as f32, s as f32, l as f32, 1.0).into();

    // rgb.into()
    let res: Transport3C = rgb.into();
    serde_wasm_bindgen::to_value(&res).unwrap()
}
