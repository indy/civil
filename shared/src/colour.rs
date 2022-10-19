// Copyright (C) 2022 Inderjit Gill <email@indy.io>

// This file is part of Civil

// Seni is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Seni is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// colour spaces
//
// Rgb  : what the world uses, avoid any colour manipulation in RGB space
// Hsluv: for humans to manipulate colours
// Oklab: for my code to manipulate colours
//
// |--------+-----------+-------------+-------------|
// | format | element 0 | element 1   | element 2   |
// |--------+-----------+-------------+-------------|
// | Rgb    | R 0..1    | G 0..1      | B 0..1      |
// | Hsluv  | H 0..360  | S 0..100    | L 0..100    |
// | Oklab  | L 0..100  | A -128..128 | B -128..128 |
// |--------+-----------+-------------+-------------|

use crate::error::{Error, Result};

const COLOUR_UNIT_ANGLE: f32 = 360.0 / 12.0;
const COLOUR_COMPLIMENTARY_ANGLE: f32 = COLOUR_UNIT_ANGLE * 6.0;
const COLOUR_TRIAD_ANGLE: f32 = COLOUR_UNIT_ANGLE * 4.0;

const REF_U: f64 = 0.197_830_006_642_836_807_640;
const REF_V: f64 = 0.468_319_994_938_791_003_700;

//  http://www.brucelindbloom.com/index.html?Equations.html
//  http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html

// we're using an sRGB working space with a D65 reference white

const CIE_EPSILON: f64 = 0.008_856;
const CIE_KAPPA: f64 = 903.3;

// sRGB colour space
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rgb {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub alpha: f32,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Oklab {
    pub l: f32,
    pub a: f32,
    pub b: f32,
    pub alpha: f32,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hsluv {
    pub h: f32,
    pub s: f32,
    pub l: f32,
    pub alpha: f32,
}

#[derive(Debug)]
struct InternalLinearRgb {
    r: f64,
    g: f64,
    b: f64,
    alpha: f32,
}

#[derive(Debug)]
struct InternalOklab {
    l: f64,
    a: f64,
    b: f64,
    alpha: f32,
}

#[derive(Debug)]
struct InternalHsluv {
    h: f64,
    s: f64,
    l: f64,
    alpha: f32,
}

#[derive(Debug)]
struct InternalXyz {
    x: f64,
    y: f64,
    z: f64,
    alpha: f32,
}

#[derive(Debug)]
struct InternalLuv {
    l: f64,
    u: f64,
    v: f64,
    alpha: f32,
}

#[derive(Debug)]
struct InternalLch {
    l: f64,
    c: f64,
    h: f64,
    alpha: f32,
}

impl Rgb {
    pub fn new(r: f32, g: f32, b: f32, alpha: f32) -> Self {
        Rgb { r, b, g, alpha }
    }

    // hex in the form: "ff00ff"
    pub fn from_rgb_hex(hex: &str) -> Result<Self> {
        if hex.len() != 6 {
            // error!(
            //     "Colour::from_rgb_hex expects input as 6 hex digits, actual: {}",
            //     hex
            // );
            return Err(Error::RgbFromHexError);
        }

        Ok(Rgb::new(
            Rgb::normalised_colour_from_hex_string(&hex[0..2])?,
            Rgb::normalised_colour_from_hex_string(&hex[2..4])?,
            Rgb::normalised_colour_from_hex_string(&hex[4..])?,
            1.0,
        ))
    }

    fn normalised_colour_from_hex_string(hex_component: &str) -> Result<f32> {
        let value = i32::from_str_radix(hex_component, 16)?;
        Ok(value as f32 / 255.0)
    }
}

impl Default for Rgb {
    fn default() -> Rgb {
        Rgb {
            r: 0.0,
            g: 0.0,
            b: 0.0,
            alpha: 1.0,
        }
    }
}

impl From<Hsluv> for Rgb {
    fn from(colour: Hsluv) -> Rgb {
        let internal_hsluv: InternalHsluv = (&colour).into();
        let internal_xyz: InternalXyz = (&internal_hsluv).into();
        let internal_rgb: InternalLinearRgb = (&internal_xyz).into();
        (&internal_rgb).into()
    }
}

impl From<&Hsluv> for Rgb {
    fn from(colour: &Hsluv) -> Rgb {
        let internal_hsluv: InternalHsluv = colour.into();
        let internal_xyz: InternalXyz = (&internal_hsluv).into();
        let internal_rgb: InternalLinearRgb = (&internal_xyz).into();
        (&internal_rgb).into()
    }
}

impl From<Oklab> for Rgb {
    fn from(colour: Oklab) -> Rgb {
        let oklab64: InternalOklab = (&colour).into();
        let rgb64: InternalLinearRgb = (&oklab64).into();
        Rgb::from(&rgb64)
    }
}

impl From<&Oklab> for Rgb {
    fn from(colour: &Oklab) -> Rgb {
        let oklab64: InternalOklab = colour.into();
        let rgb64: InternalLinearRgb = (&oklab64).into();
        Rgb::from(&rgb64)
    }
}

impl From<&InternalLinearRgb> for Rgb {
    fn from(colour: &InternalLinearRgb) -> Rgb {
        Rgb::new(
            srgb_companding(colour.r) as f32,
            srgb_companding(colour.g) as f32,
            srgb_companding(colour.b) as f32,
            colour.alpha,
        )
    }
}

impl Hsluv {
    pub fn new(h: f32, s: f32, l: f32, alpha: f32) -> Self {
        Hsluv { h, s, l, alpha }
    }

    pub fn complementary(&self) -> Hsluv {
        self.add_angle(COLOUR_COMPLIMENTARY_ANGLE)
    }

    pub fn split_complementary(&self) -> (Hsluv, Hsluv) {
        self.add_angle(COLOUR_COMPLIMENTARY_ANGLE).pair(COLOUR_UNIT_ANGLE)
    }

    pub fn analagous(&self) -> (Hsluv, Hsluv) {
        self.pair(COLOUR_UNIT_ANGLE)
    }

    pub fn triad(&self) -> (Hsluv, Hsluv) {
        self.pair(COLOUR_TRIAD_ANGLE)
    }

    fn add_angle(&self, angle: f32) -> Hsluv {
        Hsluv::new((self.h + angle) * 360.0, self.s, self.l, self.alpha)
    }

    fn pair(&self, angle: f32) -> (Hsluv, Hsluv) {
        (self.add_angle(-angle), self.add_angle(angle))
    }
}

impl Default for Hsluv {
    fn default() -> Hsluv {
        Hsluv {
            h: 0.0,
            s: 0.0,
            l: 0.0,
            alpha: 1.0,
        }
    }
}

impl From<Rgb> for Hsluv {
    fn from(colour: Rgb) -> Hsluv {
        let internal_rgb: InternalLinearRgb = (&colour).into();
        let internal_xyz: InternalXyz = (&internal_rgb).into();
        let internal_hsluv: InternalHsluv = (&internal_xyz).into();
        (&internal_hsluv).into()
    }
}

impl From<&Rgb> for Hsluv {
    fn from(colour: &Rgb) -> Hsluv {
        let internal_rgb: InternalLinearRgb = colour.into();
        let internal_xyz: InternalXyz = (&internal_rgb).into();
        let internal_hsluv: InternalHsluv = (&internal_xyz).into();
        (&internal_hsluv).into()
    }
}

impl From<Oklab> for Hsluv {
    fn from(colour: Oklab) -> Hsluv {
        let internal_oklab: InternalOklab = (&colour).into();
        let internal_xyz: InternalXyz = (&internal_oklab).into();
        let internal_hsluv: InternalHsluv = (&internal_xyz).into();
        (&internal_hsluv).into()
    }
}

impl From<&Oklab> for Hsluv {
    fn from(colour: &Oklab) -> Hsluv {
        let internal_oklab: InternalOklab = colour.into();
        let internal_xyz: InternalXyz = (&internal_oklab).into();
        let internal_hsluv: InternalHsluv = (&internal_xyz).into();
        (&internal_hsluv).into()
    }
}

impl From<&InternalHsluv> for Hsluv {
    fn from(colour: &InternalHsluv) -> Hsluv {
        Hsluv {
            h: colour.h as f32,
            s: colour.s as f32,
            l: colour.l as f32,
            alpha: colour.alpha,
        }
    }
}

impl Oklab {
    pub fn new(l: f32, a: f32, b: f32, alpha: f32) -> Self {
        Oklab { l, a, b, alpha }
    }
}

impl Default for Oklab {
    fn default() -> Oklab {
        Oklab {
            l: 0.0,
            a: 0.0,
            b: 0.0,
            alpha: 1.0,
        }
    }
}

impl From<&Rgb> for Oklab {
    fn from(colour: &Rgb) -> Oklab {
        // make sure these two lines are equivalent
        // Oklab::try_from(oklab_from_xyz(xyz_from_rgb(c)?)?),
        // Oklab::try_from(oklab_from_rgb(c)?)

        let internal_rgb: InternalLinearRgb = colour.into();
        let internal_oklab: InternalOklab = (&internal_rgb).into();
        (&internal_oklab).into()
    }
}

impl From<&Hsluv> for Oklab {
    fn from(colour: &Hsluv) -> Oklab {
        let internal_hsluv: InternalHsluv = colour.into();
        let internal_xyz: InternalXyz = (&internal_hsluv).into();
        let internal_oklab: InternalOklab = (&internal_xyz).into();
        (&internal_oklab).into()
    }
}

impl From<&InternalOklab> for Oklab {
    fn from(colour: &InternalOklab) -> Oklab {
        Oklab {
            l: colour.l as f32,
            a: colour.a as f32,
            b: colour.b as f32,
            alpha: colour.alpha,
        }
    }
}

impl From<&InternalLinearRgb> for InternalOklab {
    fn from(colour: &InternalLinearRgb) -> InternalOklab {
        let lr = colour.r;
        let lg = colour.g;
        let lb = colour.b;
        let alpha = colour.alpha;

        let l = 0.4121656120 * lr + 0.5362752080 * lg + 0.0514575653 * lb;
        let m = 0.2118591070 * lr + 0.6807189584 * lg + 0.1074065790 * lb;
        let s = 0.0883097947 * lr + 0.2818474174 * lg + 0.6302613616 * lb;

        let l_ = l.cbrt();
        let m_ = m.cbrt();
        let s_ = s.cbrt();

        let okl = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
        let oka = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
        let okb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

        InternalOklab {
            l: okl,
            a: oka,
            b: okb,
            alpha,
        }
    }
}

impl From<&InternalXyz> for InternalOklab {
    fn from(colour: &InternalXyz) -> InternalOklab {
        let x = colour.x;
        let y = colour.y;
        let z = colour.z;
        let alpha = colour.alpha;

        let l = (x * 0.818933) + (y * 0.361866) - (z * 0.1288597);
        let m = (x * 0.032984) + (y * 0.929311) + (z * 0.0361456);
        let s = (x * 0.048200) + (y * 0.264366) + (z * 0.6338517);

        let ll = l.cbrt();
        let mm = m.cbrt();
        let ss = s.cbrt();

        let okl = (ll * 0.2104542553) + (mm * 0.7936177850) - (ss * 0.0040720468);
        let oka = (ll * 1.9779984951) - (mm * 2.4285922050) + (ss * 0.4505937099);
        let okb = (ll * 0.0259040371) + (mm * 0.7827717662) - (ss * 0.8086757660);

        InternalOklab {
            l: okl,
            a: oka,
            b: okb,
            alpha,
        }
    }
}

impl From<&Oklab> for InternalOklab {
    fn from(colour: &Oklab) -> InternalOklab {
        InternalOklab {
            l: f64::from(colour.l),
            a: f64::from(colour.a),
            b: f64::from(colour.b),
            alpha: colour.alpha,
        }
    }
}

impl From<&InternalLinearRgb> for InternalXyz {
    fn from(colour: &InternalLinearRgb) -> InternalXyz {
        let x = (colour.r * 0.4124) + (colour.g * 0.3576) + (colour.b * 0.1805);
        let y = (colour.r * 0.2126) + (colour.g * 0.7152) + (colour.b * 0.0722);
        let z = (colour.r * 0.0193) + (colour.g * 0.1192) + (colour.b * 0.9505);
        let alpha = colour.alpha;

        InternalXyz { x, y, z, alpha }
    }
}

impl From<&InternalOklab> for InternalXyz {
    fn from(colour: &InternalOklab) -> InternalXyz {
        let l = colour.l;
        let a = colour.a;
        let b = colour.b;
        let alpha = colour.alpha;

        let ll = (l * 0.99999999845051981432) + (a * 0.39633779217376785678) + (b * 0.21580375806075880339);
        let aa = (l * 1.0000000088817607767) - (a * 0.1055613423236563494) - (b * 0.063854174771705903402);
        let bb = (l * 1.0000000546724109177) - (a * 0.089484182094965759684) - (b * 1.2914855378640917399);

        let lll = ll * ll * ll;
        let aaa = aa * aa * aa;
        let bbb = bb * bb * bb;

        let x = (lll * 1.2270135808797242712) - (aaa * 0.55779929373936236039) + (bbb * 0.28125599738846247759);
        let y = (lll * -0.040579504210222529446) + (aaa * 1.1122575496728821897) - (bbb * 0.071676512386310776724);
        let z = (lll * -0.076380979002443348587) - (aaa * 0.42148211232782669384) + (bbb * 1.5861632836188583913);

        InternalXyz { x, y, z, alpha }
    }
}

impl From<&InternalHsluv> for InternalXyz {
    fn from(colour: &InternalHsluv) -> InternalXyz {
        let internal_lch: InternalLch = colour.into();
        let internal_luv: InternalLuv = (&internal_lch).into();
        (&internal_luv).into()
    }
}

impl From<&InternalLuv> for InternalXyz {
    fn from(colour: &InternalLuv) -> InternalXyz {
        let l = colour.l;
        let u = colour.u;
        let v = colour.v;
        let alpha = colour.alpha;

        if l <= 0.000_000_01 {
            return InternalXyz {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                alpha,
            };
        }

        let var_u = u / (13.0 * l) + REF_U;
        let var_v = v / (13.0 * l) + REF_V;
        let y = l2y(l);
        let x = -(9.0 * y * var_u) / ((var_u - 4.0) * var_v - var_u * var_v);
        let z = (9.0 * y - (15.0 * var_v * y) - (var_v * x)) / (3.0 * var_v);

        InternalXyz { x, y, z, alpha }
    }
}

impl From<&InternalXyz> for InternalHsluv {
    fn from(colour: &InternalXyz) -> InternalHsluv {
        let internal_luv: InternalLuv = colour.into();
        let internal_lch: InternalLch = (&internal_luv).into();
        (&internal_lch).into()
    }
}

impl From<&Hsluv> for InternalHsluv {
    fn from(colour: &Hsluv) -> InternalHsluv {
        InternalHsluv {
            h: f64::from(colour.h),
            s: f64::from(colour.s),
            l: f64::from(colour.l),
            alpha: colour.alpha,
        }
    }
}

impl From<&InternalLch> for InternalHsluv {
    fn from(colour: &InternalLch) -> InternalHsluv {
        let l = colour.l;
        let c = colour.c;
        let h = colour.h;
        let alpha = colour.alpha;

        let s = if !(0.000_000_01..=99.999_999_9).contains(&l) {
            0.0
        } else {
            c / max_chroma_for_lh(l, h) * 100.0
        };

        if c < 0.000_000_01 {
            InternalHsluv { h: 0.0, s, l, alpha }
        } else {
            InternalHsluv { h, s, l, alpha }
        }
    }
}

impl From<&Rgb> for InternalLinearRgb {
    fn from(colour: &Rgb) -> InternalLinearRgb {
        InternalLinearRgb {
            r: inverse_srgb_companding(f64::from(colour.r)),
            g: inverse_srgb_companding(f64::from(colour.g)),
            b: inverse_srgb_companding(f64::from(colour.b)),
            alpha: colour.alpha,
        }
    }
}

impl From<&InternalOklab> for InternalLinearRgb {
    fn from(colour: &InternalOklab) -> InternalLinearRgb {
        let okl = colour.l;
        let oka = colour.a;
        let okb = colour.b;
        let alpha = colour.alpha;

        let l_ = okl + 0.3963377774 * oka + 0.2158037573 * okb;
        let m_ = okl - 0.1055613458 * oka - 0.0638541728 * okb;
        let s_ = okl - 0.0894841775 * oka - 1.2914855480 * okb;

        let l = l_ * l_ * l_;
        let m = m_ * m_ * m_;
        let s = s_ * s_ * s_;

        let r = 4.0767245293 * l - 3.3072168827 * m + 0.2307590544 * s;
        let g = -1.2681437731 * l + 2.6093323231 * m - 0.3411344290 * s;
        let b = -0.0041119885 * l - 0.7034763098 * m + 1.7068625689 * s;

        InternalLinearRgb { r, g, b, alpha }
    }
}

impl From<&InternalXyz> for InternalLinearRgb {
    fn from(colour: &InternalXyz) -> InternalLinearRgb {
        let x = colour.x;
        let y = colour.y;
        let z = colour.z;
        let alpha = colour.alpha;

        let r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
        let g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
        let b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

        InternalLinearRgb { r, g, b, alpha }
    }
}

impl From<&InternalXyz> for InternalLuv {
    fn from(colour: &InternalXyz) -> InternalLuv {
        let x = colour.x;
        let y = colour.y;
        let z = colour.z;
        let alpha = colour.alpha;

        let var_u = (4.0 * x) / (x + (15.0 * y) + (3.0 * z));
        let var_v = (9.0 * y) / (x + (15.0 * y) + (3.0 * z));
        let l = y2l(y);
        let u = 13.0 * l * (var_u - REF_U);
        let v = 13.0 * l * (var_v - REF_V);

        if l < 0.000_000_01 {
            InternalLuv {
                l,
                u: 0.0,
                v: 0.0,
                alpha,
            }
        } else {
            InternalLuv { l, u, v, alpha }
        }
    }
}

impl From<&InternalLch> for InternalLuv {
    fn from(colour: &InternalLch) -> InternalLuv {
        let l = colour.l;
        let c = colour.c;
        let h = colour.h;
        let alpha = colour.alpha;

        let hrad = h * 0.017_453_292_519_943_295_77; /* (pi / 180.0) */
        let u = hrad.cos() * c;
        let v = hrad.sin() * c;

        InternalLuv { l, u, v, alpha }
    }
}

impl From<&InternalHsluv> for InternalLch {
    fn from(colour: &InternalHsluv) -> InternalLch {
        let h = colour.h;
        let s = colour.s;
        let l = colour.l;
        let alpha = colour.alpha;

        let c = if !(0.000_000_01..=99.999_999_9).contains(&l) {
            0.0
        } else {
            max_chroma_for_lh(l, h) / 100.0 * s
        };

        if s < 0.000_000_01 {
            InternalLch { l, c, h: 0.0, alpha }
        } else {
            InternalLch { l, c, h, alpha }
        }
    }
}

impl From<&InternalLuv> for InternalLch {
    fn from(colour: &InternalLuv) -> InternalLch {
        let l = colour.l;
        let u = colour.u;
        let v = colour.v;
        let alpha = colour.alpha;

        let mut h: f64;
        let c = (u * u + v * v).sqrt();

        if c < 0.000_000_01 {
            h = 0.0;
        } else {
            h = v.atan2(u) * 57.295_779_513_082_320_876_80; /* (180 / pi) */
            if h < 0.0 {
                h += 360.0;
            }
        }

        InternalLch { l, c, h, alpha }
    }
}

// http://www.brucelindbloom.com/index.html?Eqn_RGB_to_XYZ.html
fn srgb_companding(a: f64) -> f64 {
    if a > 0.003_130_8 {
        (1.055 * a.powf(1.0 / 2.4)) - 0.055
    } else {
        a * 12.92
    }
}

fn l2y(l: f64) -> f64 {
    if l <= 8.0 {
        l / CIE_KAPPA
    } else {
        let x = (l + 16.0) / 116.0;
        x * x * x
    }
}

// http://www.brucelindbloom.com/index.html?Eqn_RGB_to_XYZ.html
fn inverse_srgb_companding(component: f64) -> f64 {
    if component > 0.04045 {
        ((component + 0.055) / 1.055).powf(2.4)
    } else {
        component / 12.92
    }
}
// make sure these two lines are equivalent
// Rgb::try_from(rgb_from_xyz(xyz_from_oklab(c)?))
// Rgb::try_from(rgb_from_oklab(c)?)

// the luv and hsluv code is based on https://github.com/hsluv/hsluv-c
// which uses the MIT License:

// # The MIT License (MIT)

// Copyright © 2015 Alexei Boronine (original idea, JavaScript implementation)
// Copyright © 2015 Roger Tallada (Obj-C implementation)
// Copyright © 2017 Martin Mitáš (C implementation, based on Obj-C
// implementation)

// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the “Software”),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

#[derive(Debug, Clone, Copy)]
struct Bounds {
    a: f64,
    b: f64,
}

fn get_bounds(l: f64, bounds: &mut [Bounds]) {
    let tl = l + 16.0;
    let sub1 = (tl * tl * tl) / 1_560_896.0;
    let sub2 = if sub1 > CIE_EPSILON { sub1 } else { l / CIE_KAPPA };

    let mut m = [[0f64; 3]; 3];
    m[0][0] = 3.240_969_941_904_521_343_77;
    m[0][1] = -1.537_383_177_570_093_457_94;
    m[0][2] = -0.498_610_760_293_003_283_66;
    m[1][0] = -0.969_243_636_280_879_826_13;
    m[1][1] = 1.875_967_501_507_720_667_72;
    m[1][2] = 0.041_555_057_407_175_612_47;
    m[2][0] = 0.055_630_079_696_993_608_46;
    m[2][1] = -0.203_976_958_888_976_564_35;
    m[2][2] = 1.056_971_514_242_878_560_72;

    for channel in 0..3 {
        let m1 = m[channel][0];
        let m2 = m[channel][1];
        let m3 = m[channel][2];

        for t in 0..2 {
            let top1 = (284_517.0 * m1 - 94_839.0 * m3) * sub2;
            let top2 = (838_422.0 * m3 + 769_860.0 * m2 + 731_718.0 * m1) * l * sub2 - 769_860.0 * (t as f64) * l;
            let bottom = (632_260.0 * m3 - 126_452.0 * m2) * sub2 + 126_452.0 * (t as f64);

            bounds[channel * 2 + t].a = top1 / bottom;
            bounds[channel * 2 + t].b = top2 / bottom;
        }
    }
}

fn ray_length_until_intersect(theta: f64, line: &Bounds) -> f64 {
    line.b / (theta.sin() - line.a * theta.cos())
}

fn max_chroma_for_lh(l: f64, h: f64) -> f64 {
    let mut min_len = std::f64::MAX;
    let hrad = h * 0.017_453_292_519_943_295_77; /* (2 * pi / 260) */
    let mut bounds = [Bounds { a: 0.0, b: 0.0 }; 6];

    get_bounds(l, &mut bounds);

    for b in &bounds {
        let l2 = ray_length_until_intersect(hrad, b);

        if l2 >= 0.0 && l2 < min_len {
            min_len = l2;
        }
    }

    min_len
}

/* http://en.wikipedia.org/wiki/CIELUV
 * In these formulas, Yn refers to the reference white point. We are using
 * illuminant D65, so Yn (see refY in Maxima file) equals 1. The formula is
 * simplified accordingly.
 */
fn y2l(y: f64) -> f64 {
    if y <= CIE_EPSILON {
        y * CIE_KAPPA
    } else {
        116.0 * y.cbrt() - 16.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f64_within(a: f64, b: f64, msg: &'static str) {
        const TOLERANCE_64: f64 = 0.005;
        assert!((a - b).abs() < TOLERANCE_64, "{} expected: {}, actual: {}", msg, b, a)
    }

    fn f32_within(a: f32, b: f32, msg: &'static str) {
        const TOLERANCE_32: f32 = 0.005;
        assert!((a - b).abs() < TOLERANCE_32, "{} expected: {}, actual: {}", msg, b, a)
    }

    fn assert_rgb(rgb: &Rgb, expected: [f32; 3]) {
        f32_within(rgb.r, expected[0], "r");
        f32_within(rgb.g, expected[1], "g");
        f32_within(rgb.b, expected[2], "b");
    }

    fn assert_hsluv(hsluv: &Hsluv, expected: [f32; 3]) {
        f32_within(hsluv.h, expected[0], "h");
        f32_within(hsluv.s, expected[1], "s");
        f32_within(hsluv.l, expected[2], "l");
    }

    #[test]
    fn test_hex_colour_parsing() {
        let rgb = Rgb::from_rgb_hex("ff00ff").unwrap();
        assert_rgb(&rgb, [1.0, 0.0, 1.0]);
    }

    // fn assert_equal_f64(a: f64, b: f64) {
    //     let diff = (a - b).abs();
    //     let delta: f64 = 0.0001;

    //     assert!(diff < delta, "a = {}, b = {}", a, b);
    // }

    // fn compare_oklab_from_linear_rgb(r: f64, g: f64, b: f64) {
    //     // making sure that the following lines are equivalent:
    //     //
    //     // oklab_from_xyz(xyz_from_rgb(*self)?),
    //     // oklab_from_rgb(*self),

    //     let a = ConvertibleColour::LinearRGB(r, g, b, 1.0);

    //     let oklab = oklab_from_rgb(a).unwrap();
    //     let oklab2 = oklab_from_xyz(xyz_from_rgb(a).unwrap()).unwrap();

    //     match oklab {
    //         ConvertibleColour::OKLAB(la, aa, ba, alphaa) => {
    //             match oklab2 {
    //                 ConvertibleColour::OKLAB(lb, ab, bb, alphab) => {
    //                     f64_within(la, lb, "oklab l");
    //                     f64_within(aa, ab, "oklab a");
    //                     f64_within(ba, bb, "oklab b");
    //                     f64_within(alphaa, alphab, "oklab alpha");
    //                 },
    //                 _ => assert_eq!(true, false)
    //             }
    //         },
    //         _ => assert_eq!(true, false)
    //     };
    // }

    // #[test]
    // fn test_oklab_via_xyz() {
    //     compare_oklab_from_linear_rgb(0.2, 0.098, 0.490);
    //     compare_oklab_from_linear_rgb(0.3, 0.98, 0.10);
    //     compare_oklab_from_linear_rgb(0.0, 0.4, 0.0);
    //     compare_oklab_from_linear_rgb(0.9, 0.1, 0.90);
    // }

    fn compare_oklab_reversability(x: f64, y: f64, z: f64) {
        // making sure that xyz_from_oklab is the opposite of oklab_from_xyz

        let a = InternalXyz { x, y, z, alpha: 1.0 };

        let oklab: InternalOklab = (&a).into();
        let xyz: InternalXyz = (&oklab).into();

        f64_within(x, xyz.x, "x");
        f64_within(y, xyz.y, "y");
        f64_within(z, xyz.z, "z");
    }

    #[test]
    fn test_xyz_from_oklab() {
        compare_oklab_reversability(0.5, 0.5, 0.5);
        compare_oklab_reversability(0.0, 0.0, 0.0);
        compare_oklab_reversability(1.0, 1.0, 1.0);
    }

    fn test_rgb_hsluv_conversions(hex: &str, rgb: [f32; 3], hsluv: [f32; 3]) {
        let rgbcol = Rgb::from_rgb_hex(hex).unwrap();
        assert_rgb(&rgbcol, rgb);

        let hsluvcol: Hsluv = (&rgbcol).into();
        assert_hsluv(&hsluvcol, hsluv);

        let rgbcol2: Rgb = (&hsluvcol).into();
        assert_rgb(&rgbcol2, rgb);
    }

    #[test]
    fn test_known_conversions() {
        test_rgb_hsluv_conversions(
            "11ee00",
            [0.0666666666666666657, 0.933333333333333348, 0.0], // rgb
            [127.478988192005161, 100.000000000002416, 82.5213119008325577], // hsluv
        );

        test_rgb_hsluv_conversions(
            "11ee55",
            [0.0666666666666666657, 0.933333333333333348, 0.333333333333333315],
            [131.587310643629934, 98.941589727101146, 82.8716000285422894],
        );
    }
}
