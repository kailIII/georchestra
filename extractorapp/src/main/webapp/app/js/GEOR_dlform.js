/*
 * Copyright (C) Camptocamp
 *
 * This file is part of geOrchestra
 *
 * geOrchestra is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with geOrchestra.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * @include GEOR_util.js
 * @include GEOR_layerstree.js
 */

Ext.namespace("GEOR");

GEOR.dlform = (function() {
    /*
     * Private
     */

    // Ext.Window
    var win;
    
    var createForm = function(options) {
        var ls = localStorage;
        return new Ext.FormPanel({
            labelWidth: 100,
            standardSubmit: false,
            monitorValid: true,
            frame: true,
            bodyStyle:'padding:5px 5px 0',
            defaults: {
                width: 550
            },
            defaultType: 'textfield',
            labelSeparator: ' : ',
            items: [{
                    fieldLabel: 'Prénom',
                    name: 'first_name',
                    value: GEOR.data.first_name || (ls && ls.getItem('first_name')) || '',
                    allowBlank: false
                },{
                    fieldLabel: 'Nom',
                    name: 'last_name',
                    value: GEOR.data.last_name || (ls && ls.getItem('last_name')) || '',
                    allowBlank: false
                },{
                    fieldLabel: 'Organisme',
                    value: GEOR.data.company || (ls && ls.getItem('company')) || '',
                    name: 'company',
                    allowBlank: false
                }, {
                    fieldLabel: 'Email',
                    name: 'email',
                    vtype: 'email',
                    value: GEOR.data.email || (ls && ls.getItem('email')) || '',
                    allowBlank: false
                }, {
                    fieldLabel: 'Téléphone',
                    value: GEOR.data.tel || (ls && ls.getItem('tel')) || '',
                    name: 'tel'
                },
                // data use
                {
                    xtype: 'multiselect',
                    fieldLabel: 'Applications',
                    name: 'datause',
                    height: 120,
                    allowBlank: false,
                    displayField: 'name',
                    valueField: 'id',
                    minSelections: 1,
                    store: new Ext.data.Store({
                        // requires dlform webapp to be deployed:
                        url: '/dlform/data_usage', 
                        /* test :
                        data: {
                            "rows": [
                                {"id": 1, "name": "Administratif et budgétaire"},
                                {"id": 2, "name": "Aménagement du Territoire et Gestion de l'Espace"},
                                {"id": 3, "name": "Communication"},
                                {"id": 4, "name": "Environnement"},
                                {"id": 5, "name": "Fond de Plan"},
                                {"id": 6, "name": "Foncier et Urbanisme"},
                                {"id": 7, "name": "Formation"},
                                {"id": 8, "name": "Gestion du Domaine Public"},
                                {"id": 9, "name": "Mise en valeur du Territoire (Tourisme)"},
                                {"id": 10, "name": "Risques Naturels et Technologiques"},
                            ]
                        },*/
                        autoLoad: true,
                        reader: new Ext.data.JsonReader({
                            root: 'rows',
                            fields: ['id', 'name'],
                            idProperty: 'id'
                        })
                    })
                },
                // comment
                {
                    xtype:'htmleditor',
                    fieldLabel:'Commentaires',
                    name: 'comment',
                    height: 150
                },
                // checkbox
                {
                    xtype:'checkboxgroup',
                    allowBlank: false,
                    columns: 1,
                    items: [{
                        boxLabel: "J'accepte sans réserve les <a href='" +
                            GEOR.config.PDF_URL +
                            "' target='_blank'>conditions d'utilisation</a> des données.",
                        name: 'ok'
                    }]
                }, 
                // hidden fields:
                {
                    xtype: 'hidden',
                    name: 'json_spec',
                    value: Ext.encode(GEOR.layerstree.getSpec())
                }, 
                {
                    xtype: 'hidden',
                    name: 'sessionid',
                    value: GEOR.util.getCookie('JSESSIONID')
                }
            ],
            buttons: [{
                text: 'OK',
                formBind: true,
                handler: function() {
                    var fp = this.ownerCt.ownerCt,
                        form = fp.getForm();
                    if (form.isValid()) {
                        
                        // save form fields in local storage if not connected.
                        if (ls) {
                            var fields = ['first_name', 'last_name', 'company', 'email', 'tel'];
                            if (GEOR.data.anonymous) {
                                var v = form.getValues();
                                GEOR.data.email = v['email']; // offer a last chance to change email
                                for (var i=0,l=fields.length;i<l;i++) {
                                    ls.setItem(fields[i], v[fields[i]]);
                                }
                            } else {
                                // clear values
                                for (var i=0,l=fields.length;i<l;i++) {
                                    ls.removeItem(fields[i]);
                                }
                            }
                        }
                        
                        form.submit({
                            // requires dlform webapp to be deployed:
                            url: '/dlform/extractorapp',
                            success: function() {
                                win.close();
                                options.callback.call();
                            },
                            failure: function(form, action) {
                                switch (action.failureType) {
                                    case Ext.form.Action.CLIENT_INVALID:
                                        // should not happen, since we have formBind
                                        GEOR.util.errorDialog({
                                            msg: 'Formulaire invalide'
                                        });
                                        break;
                                    case Ext.form.Action.CONNECT_FAILURE:
                                        GEOR.util.errorDialog({
                                            msg: ['Impossible de sauver le formulaire', 
                                                "Merci de contacter l'administrateur de la plateforme"].join('<br />')
                                        });
                                        break;
                                    case Ext.form.Action.SERVER_INVALID:
                                        GEOR.util.errorDialog({
                                            msg: action.result.msg
                                        });
                                }
                            }
                        });
                    }
                }
            }]
        });
    };

    /*
     * Public
     */
    return {

        /**
         * APIMethod: show
         * displays the popup with form inside
         *
         * Parameters:
         * map - {Object} config options
         *
         */
        show: function(options) {
            Ext.QuickTips.init();
            
            if (!win) {
                win = new Ext.Window({
                    title: "Prenez quelques instants pour nous indiquer l'utilisation des données",
                    constrainHeader: true,
                    layout: 'fit',
                    border: false,
                    width: 700,
                    height: 520,
                    closeAction: 'hide',
                    modal: true,
                    items: [createForm(options)]
                });
            }
            win.show();
        }
    };
})();