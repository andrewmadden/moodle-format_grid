// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Grid Format - A topics based format that uses a grid of user selectable images to popup a light box of the section.
 *
 * @package    course/format
 * @subpackage grid
 * @copyright  &copy; 2012 G J Barnard in respect to modifications of standard topics format.
 * @author     G J Barnard - gjbarnard at gmail dot com and {@link http://moodle.org/user/profile.php?id=442195}
 * @author     Based on code originally written by Paul Krix and Julian Ridden.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 /**
 * @namespace
 */
M.format_grid = M.format_grid || {
    ourYUI: null,
    editing_on: null,
    update_capability: null,
    selected_section: null,
    num_sections: null,
    selected_section_no: -1,
    shadebox_shown_array: null
};
M.format_grid.shadebox = M.format_grid.shadebox || {};

/**
 * Initialise with the information supplied from the course format so we can operate.
 * @param {Object} Y YUI instance
 * @param {Boolean} the_editing_on If editing is on.
 * @param {Boolean} the_update_capability If the calling user can update the course.
 * @param {Integer} the_num_sections the number of sections in the course.
 * @param {Array} the_shadebox_shown_array States what sections are not shown (value of 1) and which are (value of 2)
 *                                         index is the section no.
 */
M.format_grid.init = function(Y, the_editing_on, the_update_capability, the_num_sections, the_shadebox_shown_array) {
    "use strict";
    this.ourYUI = Y;
    this.editing_on = the_editing_on;
    this.update_capability = the_update_capability;
    this.selected_section = null;
    this.num_sections = parseInt(the_num_sections);
    console.log("SSA parameter: " + the_shadebox_shown_array);
    this.shadebox_shown_array = JSON.parse(the_shadebox_shown_array);
    console.log("SSA var: " + the_shadebox_shown_array);

    if (this.num_sections > 0) {
        this.set_selected_section(this.num_sections, true, true);  // Section 0 can be in the grid.
        console.log("init() - selected section no: " + this.selected_section_no);
    } else {
        this.selected_section_no = -1;
    }

    Y.delegate('click', this.icon_click, Y.config.doc, 'ul.gridicons a.gridicon_link', this);

    var shadeboxtoggleone = Y.one("#gridshadebox_overlay");
    if (shadeboxtoggleone) {
        shadeboxtoggleone.on('click', this.icon_toggle, this);
    }
    var shadeboxtoggletwo = Y.one("#gridshadebox_close");
    if (shadeboxtoggletwo) {
        shadeboxtoggletwo.on('click', this.icon_toggle, this);
    }
    var shadeboxarrowleft = Y.one("#gridshadebox_left");
    if (shadeboxarrowleft) {
        shadeboxarrowleft.on('click', this.arrow_left, this);
    }
    var shadeboxarrowright = Y.one("#gridshadebox_right");
    if (shadeboxarrowright) {
        shadeboxarrowright.on('click', this.arrow_right, this);
    }

    // Have to show the column when editing / capability to update.
    if (the_editing_on && the_update_capability) {
        // Show the sections when editing.
        Y.all(".grid_section").removeClass('hide_section');
    } else {
        // Remove href link from icon anchors so they don't compete with javascript onlick calls.
        var icon_links = getElementsByClassName(document.getElementById("gridiconcontainer"), "a", "icon_link");
        for(var i = 0; i < icon_links.length; i++) {
            icon_links[i].href = "#";
        }
        document.getElementById("gridshadebox_close").style.display = "";
        document.getElementById("gridshadebox_left").style.display = "";
        document.getElementById("gridshadebox_right").style.display = "";

        M.format_grid.shadebox.initialize_shadebox();
        M.format_grid.shadebox.update_shadebox();
        window.onresize = function() {
            M.format_grid.shadebox.update_shadebox();
        }
    }
    Y.one("#gridshadebox_content").removeClass('hide_content'); // Content 'flash' prevention.
}

/**
 * Called when the user clicks on the grid icon, set up in the init() method.
 */
M.format_grid.icon_click = function(e) {
    "use strict";
    e.preventDefault();
    var icon_index = parseInt(e.currentTarget.get('id').replace("gridsection-", ""));
    //console.log(icon_index);
    var previous_no = this.selected_section_no;
    this.selected_section_no = icon_index;
    this.update_selected_background(previous_no);
    this.icon_toggle(e);
};

/**
 * Called when the user clicks on the left arrow on the shade box or when they press the left
 * cursor key or Shift-TAB on the keyboard - see 'gridkeys.js'.
 * Moves to the previous visible section - looping to the last if the current is the first.
 * @param {Object} e Event object.
 */
M.format_grid.arrow_left = function(e) {
    "use strict";
    this.change_selected_section(false);
};

/**
 * Called when the user clicks on the right arrow on the shade box or when they press the right
 * cursor key or TAB on the keyboard - see 'gridkeys.js'.
 * Moves to the next visible section - looping to the first if the current is the last.
 * @param {Object} e Event object.
 */
M.format_grid.arrow_right = function(e) {
    "use strict";
    this.change_selected_section(true);
};

/**
 * Toggles the shade box on / off.
 * Called when the user clicks on a grid icon or presses the Esc or Enter keys - see 'gridkeys.js'.
 * @param {Object} e Event object.
 */
M.format_grid.icon_toggle = function(e) {
    "use strict";
    e.preventDefault();
    //console.log(this.selected_section_no);
    if (this.selected_section_no != -1) { // Then a valid shown section has been selected.
        if ((this.editing_on == true) && (this.update_capability == true)) {
            window.scroll(0,document.getElementById("section-" + this.selected_section_no).offsetTop);
        } else if (M.format_grid.shadebox.shadebox_open == true) {
            console.log("Shadebox was open");
            this.shadebox.toggle_shadebox();
        } else {
            console.log("Shadebox was closed");
            this.icon_change_shown();
            this.shadebox.toggle_shadebox();
            this.update_arrows();
        }
    } else {
        console.log("Grid format:icon_toggle() - no selected section to show.");
    }
};

/**
 * Changes the current section in response to user input either arrows or keys.
 * @param {Boolean} increase_section If 'true' to to the next section, if 'false' go to the previous.
 */
M.format_grid.change_selected_section = function(increase_section) {
    "use strict";
    if (this.selected_section_no != -1) { // Then a valid shown section has been selected.
        this.set_selected_section(this.selected_section_no, increase_section, false);
        console.log("Selected section no is now: " + this.selected_section_no);
        if (M.format_grid.shadebox.shadebox_open == true) {
            this.icon_change_shown();
            this.update_arrows();
        }
    } else {
        console.log("Grid format:change_selected_section() - no selected section to show.");
    }
};

/**
 * Changes the shown section within the shade box to the new one defined in 'selected_section_no'.
 */
M.format_grid.icon_change_shown = function() {
    "use strict";
    // Make the selected section visible, scroll to it and hide all other sections.
    if(this.selected_section != null) {
        this.selected_section.addClass('hide_section');
    }
    this.selected_section = this.ourYUI.one("#section-" + this.selected_section_no);

    this.selected_section.removeClass('hide_section');
};

/**
 * Changes the position of the shade box arrows to be in the centre when the section changes.
 */
M.format_grid.update_arrows = function() {
    "use strict";
    var content = M.format_grid.ourYUI.one("#gridshadebox_content");
    var arrow_l = document.getElementById("gridshadebox_left");
    var arrow_r = document.getElementById("gridshadebox_right");
    var computed_height = ((content.get('clientHeight') / 2) - 8);
    console.log(content.getComputedStyle('height'));
    console.log(content.get('clientHeight'));
    arrow_l.style.top = computed_height + "px";
    arrow_r.style.top = computed_height + "px";
};

/**
 * Works out what the 'next' section should be given the starting point and direction.  If called from
 * init() then will ignore that there is no current section upon which to 'un-select' before we select
 * the new one.  The result is placed in 'selected_section_no'.
 * @param {Integer} starting_point The starting point upon which to start the search.
 * @param {Boolean} increase_section If 'true' to to the next section, if 'false' go to the previous.
 * @param {Boolean} initialise If 'true' we are initialising and therefore no current section.
 */
M.format_grid.set_selected_section = function(starting_point, increase_section, initialise) {
    "use strict";
    if ((this.selected_section_no != -1) || (initialise == true)) {
        var previous_no = this.selected_section_no;
        this.selected_section_no = this.find_next_shown_section(starting_point, increase_section);
        this.update_selected_background(previous_no);
    }
};

/**
 * Updates the selected icon background.
 * @param {Integer} previous_no The number of the previous section.
 */
M.format_grid.update_selected_background = function(previous_no) {
    "use strict";
    if (this.selected_section_no != -1) {
        var selected_section = this.ourYUI.one("#gridsection-" + this.selected_section_no);
        selected_section.get('parentNode').addClass('currentselected');
    }
    if ((previous_no != -1) && (previous_no != this.selected_section_no)) { // Do not un-select if we are the current section.
        var previous_section = this.ourYUI.one("#gridsection-" + previous_no);
        previous_section.get('parentNode').removeClass('currentselected');
    }
};

/**
 * Returns the next shown section from the given starting point and direction.
 * @param {Integer} starting_point The starting point upon which to start the search.
 * @param {Boolean} increase_section If 'true' to to the next section, if 'false' go to the previous.
 * @returns {Integer} The next section number or '-1' if not found.
 */
M.format_grid.find_next_shown_section = function(starting_point, increase_section) {
    "use strict";
    var found = false;
    var current = starting_point;
    var next = -1;

    while(found == false) {
        if (increase_section == true) {
            current++;
            if (current > this.num_sections) {
                current = 0;
            }
        } else {
            current--;
            if (current < 0) {
                current = this.num_sections;
            }
        }

        // Guard against repeated looping code...
        if (current == starting_point) {
            found = true; // Exit loop and 'next' will be '-1'.
        } else if (this.shadebox_shown_array[current] == 2) { // This section can be shown.
            next = current;
            found = true; // Exit loop and 'next' will be 'current'.
        }
    }

    return next;
};

/** Below is shade box code **/
M.format_grid.shadebox.shadebox_open; // Boolean stating if the shade box is open or not.

/**
 * Initialises the shade box.
 */
M.format_grid.shadebox.initialize_shadebox = function() {
    "use strict";
    this.shadebox_open = false;
    this.hide_shadebox();

    document.getElementById('gridshadebox_overlay').style.display="";
    document.body.appendChild(document.getElementById('gridshadebox'));

    var content = document.getElementById('gridshadebox_content');
    content.style.position = 'absolute';
    content.style.width = '90%';
    content.style.top = '50px';
    content.style.left = '5%';
    //content.style.marginLeft = '-400px';
    content.style.zIndex = '9000001';
}

/**
 * Toggles the shade box open / closed.
 */
M.format_grid.shadebox.toggle_shadebox = function() {
    "use strict";
    if (this.shadebox_open) {
        this.hide_shadebox();
        this.shadebox_open = false;
    } else {
        window.scrollTo(0, 0);
        this.show_shadebox();
        this.shadebox_open = true;
    }
}

/**
 * Shows the shade box.
 */
M.format_grid.shadebox.show_shadebox = function() {
    "use strict";
    this.update_shadebox();
    document.getElementById("gridshadebox").style.display = "";
}

/**
 * Hides the shade box.
 */
M.format_grid.shadebox.hide_shadebox = function() {
    "use strict";
    document.getElementById("gridshadebox").style.display = "none";
}

/**
 * Adjusts the size of the shade box every time it's shown as the browser window could have changed.
 */
M.format_grid.shadebox.update_shadebox = function() {
    "use strict";
    // Make the overlay full screen (width happens automatically, so just update the height).
    var overlay = document.getElementById("gridshadebox_overlay");
    var pagesize = this.get_page_height();
    overlay.style.height = pagesize + "px";
}

/**
 * Gets the page height.
 * Code from quirksmode.org.
 * Author unknown.
 */
M.format_grid.shadebox.get_page_height = function() {
    "use strict";
    var yScroll;
    if(window.innerHeight && window.scrollMaxY) {
        yScroll = window.innerHeight + window.scrollMaxY;
    } else if(document.body.scrollHeight > document.body.offsetHeight) { // All but Explorer Mac.
        yScroll = document.body.scrollHeight;
    } else { // Explorer Mac ... also works in Explorer 6 strict and safari.
        yScroll = document.body.offsetHeight;
    }

    var windowHeight;
    if(self.innerHeight) { // All except Explorer.
        windowHeight = self.innerHeight;
    } else if(document.documentElement && document.documentElement.clientHeight) { // Explorer 6 strict mode.
        windowHeight = document.documentElement.clientHeight;
    } else if(document.body) { //other Explorers
        windowHeight = document.body.clientHeight;
    }

    // For small pages with total height less than height of the viewport.
    var pageHeight;
    if(yScroll < windowHeight) {
        pageHeight = windowHeight;
    } else {
        pageHeight = yScroll;
    }

    return pageHeight;
}